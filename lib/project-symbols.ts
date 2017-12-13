import * as ts from 'typescript';

import { ResourceResolver } from './resource-resolver';

import { ViewEncapsulation, ɵConsole } from '@angular/core';
import {
  CompileMetadataResolver,
  NgModuleResolver,
  DirectiveResolver,
  DirectiveNormalizer,
  UrlResolver,
  HtmlParser,
  CompilerConfig,
  PipeResolver,
  AotSummaryResolver,
  DomElementSchemaRegistry,
  StaticSymbolResolver,
  StaticSymbolCache,
  StaticSymbol,
  StaticReflector,
  createOfflineCompileUrlResolver,
  analyzeNgModules,
  NgAnalyzedModules,
  CompileNgModuleMetadata,
  GeneratedFile
} from '@angular/compiler';

import { AngularCompilerOptions, MetadataCollector } from '@angular/compiler-cli';

import { PipeSymbol } from './pipe-symbol';
import { DirectiveSymbol } from './directive-symbol';
import { ModuleSymbol } from './module-symbol';
import { ProviderSymbol } from './provider-symbol';
import { CompileProviderMetadata } from '@angular/compiler';
import { createCompilerHost } from 'typescript';
import { TsCompilerAotCompilerTypeCheckHostAdapter } from '@angular/compiler-cli/src/transformers/compiler_host';

export interface ErrorReporter {
  (error: any, path: string): void;
}

/**
 * Creates a proxy which provides us access to the symbols
 * defined in given context (could be lazy loaded module or the root module).
 *
 * @export
 * @class ProjectSymbols
 */
export class ProjectSymbols {
  private metadataResolver: CompileMetadataResolver;
  private reflector: StaticReflector;
  private summaryResolver: AotSummaryResolver;
  private staticSymbolResolver: StaticSymbolResolver;
  private staticResolverHost: TsCompilerAotCompilerTypeCheckHostAdapter;
  private pipeResolver: PipeResolver;
  private directiveResolver: DirectiveResolver;
  private urlResolver: UrlResolver;
  private directiveNormalizer: DirectiveNormalizer;
  private lastProgram: ts.Program;
  private options: AngularCompilerOptions;
  private analyzedModules: NgAnalyzedModules;

  /**
   * Creates an instance of ProjectSymbols.
   *
   * @param {ts.Program} program
   * @param {ResourceResolver} resourceResolver
   *
   * @memberOf ProjectSymbols
   */
  constructor(
    private program: ts.Program,
    private resourceResolver: ResourceResolver,
    private errorReporter: ErrorReporter
  ) {
    this.options = this.program.getCompilerOptions();
    this.init();
  }

  /**
   * Returns the metadata associated to this module.
   *
   * @returns {ModuleSymbol[]}
   *
   * @memberOf ProjectSymbols
   */
  getModules(): ModuleSymbol[] {
    this.validate();
    const resultMap: Map<StaticSymbol, CompileNgModuleMetadata> = new Map();
    this.getAnalyzedModules().ngModules.forEach((m, s) => {
      resultMap.set(m.type.reference, m);
    });
    const result: ModuleSymbol[] = [];
    resultMap.forEach(v =>
      result.push(
        new ModuleSymbol(
          this.program,
          v.type.reference,
          this.metadataResolver,
          this.directiveNormalizer,
          this.directiveResolver,
          this.pipeResolver,
          this.reflector,
          this.resourceResolver,
          this
        )
      )
    );
    return result;
  }

  /**
   * Returns all the directives available in the context.
   *
   * @returns {DirectiveSymbol[]}
   *
   * @memberOf ProjectSymbols
   */
  getDirectives(): DirectiveSymbol[] {
    return this.extractProgramSymbols()
      .filter(symbol => this.metadataResolver.isDirective(symbol))
      .map(
        symbol =>
          new DirectiveSymbol(
            this.program,
            symbol,
            this.metadataResolver,
            this.directiveNormalizer,
            this.directiveResolver,
            this.reflector,
            this.resourceResolver,
            this
          )
      );
  }

  /**
   * Returns all the pipes available in this module.
   *
   * @returns {PipeSymbol[]}
   *
   * @memberOf ProjectSymbols
   */
  getPipes(): PipeSymbol[] {
    return this.extractProgramSymbols()
      .filter(v => this.metadataResolver.isPipe(v))
      .map(p => new PipeSymbol(this.program, p, this.pipeResolver, this.metadataResolver, this));
  }

  /**
   * Returns all the providers available in this module.
   *
   * @returns {ProviderSymbol[]}
   *
   * @memberOf ProjectSymbols
   */
  getProviders(): ProviderSymbol[] {
    const resultSet = new Map<CompileProviderMetadata, ProviderSymbol>();
    this.getModules().forEach(m => {
      m.getProviders().forEach(p => resultSet.set(p.getMetadata(), p));
    });
    this.getDirectives().forEach(d => {
      d.getProviders().forEach(p => resultSet.set(p.getMetadata(), p));
      d.getViewProviders().forEach(p => resultSet.set(p.getMetadata(), p));
    });
    const finalResult: ProviderSymbol[] = [];
    resultSet.forEach(v => finalResult.push(v));
    return finalResult;
  }

  /**
   * Updates the program which has impact over the loaded symbols.
   * In case the `update` method is called with program different from
   * the current one, all the internal caches will be cleared.
   *
   * @param {ts.Program} program
   *
   * @memberOf ProjectSymbols
   */
  updateProgram(program: ts.Program): void {
    if (program !== this.program) {
      this.program = program;
      this.validate();
    }
  }

  /**
   * Returns directive based on `ClassDeclaration` node and a filename.
   *
   * @param {ts.ClassDeclaration} declaration
   * @param {string} fileName
   *
   * @memberOf DirectiveSymbol
   */
  getDirectiveFromNode(declaration: ts.ClassDeclaration, fileName: string) {
    const sourceFile = this.program.getSourceFile(fileName);
    const identifier = declaration.name;
    if (identifier) {
      return new DirectiveSymbol(
        this.program,
        this.reflector.getStaticSymbol(sourceFile.fileName, identifier.text),
        this.metadataResolver,
        this.directiveNormalizer,
        this.directiveResolver,
        this.reflector,
        this.resourceResolver,
        this
      );
    } else {
      return null;
    }
  }

  /** @internal */
  getAnalyzedModules(): NgAnalyzedModules {
    let analyzedModules = this.analyzedModules;
    if (!analyzedModules) {
      const analyzeHost = {
        isSourceFile(filePath: string) {
          return true;
        }
      };

      analyzedModules = this.analyzedModules = analyzeNgModules(
        this.program.getRootFileNames(),
        analyzeHost,
        this.staticSymbolResolver,
        this.metadataResolver
      );
    }
    return analyzedModules;
  }

  private extractProgramSymbols() {
    return [].concat.apply(
      [],
      this.program.getSourceFiles().map(f => this.staticSymbolResolver.getSymbolsOf(f.fileName))
    );
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
    this.metadataResolver.clearCache();
    this.directiveNormalizer.clearCache();
  }

  private init() {
    const staticSymbolCache = new StaticSymbolCache();

    const summaryResolver = new AotSummaryResolver(
      {
        loadSummary(filePath: string) {
          return '';
        },
        isSourceFile(sourceFilePath: string) {
          return true;
        },
        toSummaryFileName(host) {
          return '';
        },
        fromSummaryFileName(host) {
          return '';
        }
      },
      staticSymbolCache
    );

    const parser = new HtmlParser();
    const config = new CompilerConfig({
      defaultEncapsulation: ViewEncapsulation.Emulated,
      useJit: false
    });

    const defaultDir = this.program.getCurrentDirectory();
    this.options.baseUrl = this.options.baseUrl || defaultDir;
    this.options.basePath = this.options.basePath || defaultDir;
    this.options.genDir = this.options.genDir || defaultDir;

    this.staticResolverHost = new TsCompilerAotCompilerTypeCheckHostAdapter(
      this.program.getRootFileNames(),
      this.options,
      createCompilerHost(this.program.getCompilerOptions()),
      new MetadataCollector(),
      {
        generateFile: (genFileName, baseFileName) => new GeneratedFile('', '', ''),
        findGeneratedFileNames: fileName => []
      }
    );

    this.staticSymbolResolver = new StaticSymbolResolver(
      this.staticResolverHost,
      staticSymbolCache,
      summaryResolver,
      this.errorReporter
    );

    this.summaryResolver = new AotSummaryResolver(this.staticResolverHost, staticSymbolCache);

    this.reflector = new StaticReflector(this.summaryResolver, this.staticSymbolResolver, [], [], this.errorReporter);

    const ngModuleResolver = new NgModuleResolver(this.reflector);
    this.directiveResolver = new DirectiveResolver(this.reflector);
    this.pipeResolver = new PipeResolver(this.reflector);

    this.urlResolver = createOfflineCompileUrlResolver();
    this.directiveNormalizer = new DirectiveNormalizer(this.resourceResolver, this.urlResolver, parser, config);

    this.metadataResolver = new CompileMetadataResolver(
      new CompilerConfig(),
      parser,
      ngModuleResolver,
      this.directiveResolver,
      this.pipeResolver,
      summaryResolver,
      new DomElementSchemaRegistry(),
      this.directiveNormalizer,
      new ɵConsole(),
      staticSymbolCache,
      this.reflector
    );
  }
}
