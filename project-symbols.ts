import * as ts from 'typescript';

import * as fs from 'fs';
import * as path from 'path';

import {createProgram} from './create-program';

import {TemplateSource} from './types';

import {ViewEncapsulation, NO_ERRORS_SCHEMA} from '@angular/core';
import {
  CompileMetadataResolver,
  NgModuleResolver,
  DirectiveResolver,
  DirectiveNormalizer,
  ResourceLoader,
  UrlResolver,
  HtmlParser,
  CompilerConfig,
  PipeResolver,
  AotSummaryResolver,
  DomElementSchemaRegistry,
  analyzeAndValidateNgModules,
  extractProgramSymbols,
  StaticSymbolResolver,
  StaticSymbolResolverHost,
  StaticSymbolCache,
  StaticSymbol,
  StaticReflector,
  SummaryResolver,
  createOfflineCompileUrlResolver,
  analyzeNgModules,
  NgAnalyzedModules,
  I18NHtmlParser,
  Parser,
  Lexer,
  TemplateParser,
  CompileNgModuleMetadata
} from '@angular/compiler';

import {
  CompilerHost,
  AngularCompilerOptions,
  CompilerHostContext,
  ModuleMetadata,
  NodeCompilerHostContext
} from '@angular/compiler-cli';

export class FileSystemResourceLoader extends ResourceLoader {
  get(url: string): Promise<string> {
    return Promise.resolve(fs.readFileSync(url).toString());
  }
}

export class ProjectSymbols {
  public metadataResolver: CompileMetadataResolver;
  public reflector: StaticReflector;
  public staticSymbolResolver: StaticSymbolResolver;
  public staticResolverHost: CompilerHost;

  private lastProgram: ts.Program;
  private options: AngularCompilerOptions;
  private analyzedModules: NgAnalyzedModules;

  constructor(private program: ts.Program) {
    this.options = this.program.getCompilerOptions();
    this.init();
  }

  getModules() {
    this.validate();
    const result: [{ node: ts.Node, metadata: CompileNgModuleMetadata }] =
      [] as [{ node: ts.Node, metadata: CompileNgModuleMetadata }];
    this.ensureAnalyzedModules()
      .ngModuleByPipeOrDirective
      .forEach((m, s) => {
        result.push({
          node: this.findNode(s),
          metadata: m
        });
      });
    return result;
  }

  getDirectives() {
    return this.extractProgramSymbols()
      .filter(v => this.metadataResolver.isDirective(v))
      .map(v => {
        return {
          node: this.findNode(v),
          metadata: this.metadataResolver.getDirectiveMetadata(v)
        };
      });
  }

  getPipes() {
    return this.extractProgramSymbols()
      .filter(v => this.metadataResolver.isPipe(v));
      // .map(v => this.metadataResolver.getPipeMetadata(v));
  }

  updateProgram(program: ts.Program) {
    if (program !== this.program) {
      this.program = program;
      this.validate();
    }
  }

  private getDirectiveMetadata(d: StaticSymbol) {
    const metadata = this.metadataResolver.getNonNormalizedDirectiveMetadata(d);
    return metadata.metadata;
  }

  private getTemplateAst(template: TemplateSource, contextFile: string): any {
    let result: any;
    try {
      const resolvedMetadata =
          this.metadataResolver.getNonNormalizedDirectiveMetadata(template.type as any);
      const metadata = resolvedMetadata && resolvedMetadata.metadata;
      if (metadata) {
        const rawHtmlParser = new HtmlParser();
        const htmlParser = new I18NHtmlParser(rawHtmlParser);
        const expressionParser = new Parser(new Lexer());
        const parser = new TemplateParser(
            expressionParser, new DomElementSchemaRegistry(), htmlParser, null, []);
        const htmlResult = htmlParser.parse(template.source, '');
        const analyzedModules = this.ensureAnalyzedModules();
        let ngModule = analyzedModules.ngModuleByPipeOrDirective.get(template.type);
        // if (!ngModule) {
        //   // Reported by the the declaration diagnostics.
        //   ngModule = findSuitableDefaultModule(analyzedModules);
        // }
        if (ngModule) {
          const resolvedDirectives = ngModule.transitiveModule.directives.map(
              d => this.metadataResolver.getNonNormalizedDirectiveMetadata(d.reference));
          const directives =
              resolvedDirectives.filter(d => d !== null).map(d => d.metadata.toSummary());
          const pipes = ngModule.transitiveModule.pipes.map(
              p => this.metadataResolver.getOrLoadPipeMetadata(p.reference).toSummary());
          const schemas = ngModule.schemas;
          const parseResult = parser.tryParseHtml(
              htmlResult, metadata, template.source, directives, pipes, schemas, '');
          result = {
            htmlAst: htmlResult.rootNodes,
            templateAst: parseResult.templateAst,
            directive: metadata, directives, pipes,
            parseErrors: parseResult.errors, expressionParser
          };
        }
      }
    } catch (e) {
      // let span = template.span;
      result = {errors: [{message: e.message}]};
    }
    return result;
  }

  private findNode(symbol: StaticSymbol): ts.Node|undefined {
    function find(node: ts.Node): ts.Node|undefined {
      if (node && node.kind === ts.SyntaxKind.ClassDeclaration) {
        if (symbol.name !== (node as ts.ClassDeclaration).name.text) {
          return ts.forEachChild(node, find);
        } else {
          return node;
        }
      }
    }
    return find(this.program.getSourceFile(symbol.filePath));
  }

  private extractProgramSymbols() {
    return extractProgramSymbols(
      this.staticSymbolResolver, this.program.getSourceFiles().map(sf => sf.fileName), {
        isSourceFile() { return true; }
      });
  }

  private ensureAnalyzedModules(): NgAnalyzedModules {
    let analyzedModules = this.analyzedModules;
    if (!analyzedModules) {
      const analyzeHost = {isSourceFile(filePath: string) { return true; }};
      const programSymbols = extractProgramSymbols(
          this.staticSymbolResolver, this.program.getSourceFiles().map(sf => sf.fileName),
          analyzeHost);

      analyzedModules = this.analyzedModules =
          analyzeNgModules(programSymbols, analyzeHost, this.metadataResolver);
    }
    return analyzedModules;
  }

  private validate() {
    const program = this.program;
    if (this.lastProgram !== program) {
      this.clearCaches();
      this.lastProgram = program;
      this.init();
    }
  }

  private clearCaches() {
    this.metadataResolver = null;
  }

  private init() {
    this.validate();
    const staticSymbolCache = new StaticSymbolCache();

    const summaryResolver = new AotSummaryResolver({
      loadSummary(filePath: string) { return null; },
      isSourceFile(sourceFilePath: string) { return true; },
    }, staticSymbolCache);

    const parser = new HtmlParser();
    const config = new CompilerConfig({
      genDebugInfo: false,
      defaultEncapsulation: ViewEncapsulation.Emulated,
      logBindingUpdate: false,
      useJit: false
    });

    const fileResolver = new FileSystemResourceLoader();
    const normalizer = new DirectiveNormalizer(fileResolver, createOfflineCompileUrlResolver(), parser, config);

    this.staticResolverHost = new CompilerHost(this.program, this.options, new NodeCompilerHostContext());

    this.staticSymbolResolver = new StaticSymbolResolver(
            this.staticResolverHost, staticSymbolCache, summaryResolver,
            (e, filePath) => {
              console.log(e, filePath);
            });

    this.reflector = new StaticReflector(
          this.staticSymbolResolver, [], [], (e, filePath) => {
              console.log(e, filePath);
            });

    const ngModuleResolver = new NgModuleResolver(this.reflector);
    const dirResolver = new DirectiveResolver(this.reflector);
    const pipeResolver = new PipeResolver(this.reflector);

    const directiveNormalizer = new DirectiveNormalizer(fileResolver, new UrlResolver(), parser, config);

    this.metadataResolver = new CompileMetadataResolver(
            ngModuleResolver, dirResolver, pipeResolver, summaryResolver,
            new DomElementSchemaRegistry(), directiveNormalizer, this.reflector);
  }
}
