import * as ts from 'typescript';

import {ResourceResolver} from './resource-resolver';

import {ViewEncapsulation} from '@angular/core';
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
  extractProgramSymbols,
  StaticSymbolResolver,
  StaticSymbolCache,
  StaticReflector,
  createOfflineCompileUrlResolver,
  analyzeNgModules,
  NgAnalyzedModules,
  CompileNgModuleMetadata,
} from '@angular/compiler';

import {
  CompilerHost,
  AngularCompilerOptions,
  NodeCompilerHostContext
} from '@angular/compiler-cli';

import {PipeSymbol} from './pipe-symbol';
import {DirectiveSymbol} from './directive-symbol';

export class ProjectSymbols {
  public metadataResolver: CompileMetadataResolver;
  public reflector: StaticReflector;
  public staticSymbolResolver: StaticSymbolResolver;
  public staticResolverHost: CompilerHost;
  public pipeResolver: PipeResolver;

  private directiveResolver: DirectiveResolver;
  private urlResolver: UrlResolver;
  private directiveNormalizer: DirectiveNormalizer;
  private lastProgram: ts.Program;
  private options: AngularCompilerOptions;
  private analyzedModules: NgAnalyzedModules;

  constructor(private program: ts.Program, private resourceResolver: ResourceResolver) {
    this.options = this.program.getCompilerOptions();
    this.init();
  }

  getModules() {
    this.validate();
    const result: CompileNgModuleMetadata[] = [];
    this.getAnalyzedModules()
      .ngModuleByPipeOrDirective
      .forEach((m, s) => {
        result.push(m);
      });
    return result;
  }

  getDirectives(): DirectiveSymbol[] {
    return this.extractProgramSymbols()
      .filter(s => this.metadataResolver.isDirective(s))
      .map(s => new DirectiveSymbol(
        this.program,
        s,
        this.metadataResolver,
        this.directiveNormalizer,
        this.directiveResolver,
        this.reflector,
        this.resourceResolver,
        this
      ));
  }

  getPipes() {
    return this.extractProgramSymbols()
      .filter(v => this.metadataResolver.isPipe(v))
      .map(p => new PipeSymbol(this.program, p, this.pipeResolver, this));
  }

  getProjectSummary() {
    const module = this.getModules().pop();
    return this.metadataResolver.getNgModuleSummary(module.type.reference);
  }

  updateProgram(program: ts.Program) {
    if (program !== this.program) {
      this.program = program;
      this.validate();
    }
  }

  getAnalyzedModules(): NgAnalyzedModules {
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

  private extractProgramSymbols() {
    return extractProgramSymbols(
      this.staticSymbolResolver, this.program.getSourceFiles().map(sf => sf.fileName), {
        isSourceFile() { return true; }
      });
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
    this.directiveResolver = new DirectiveResolver(this.reflector);
    this.pipeResolver = new PipeResolver(this.reflector);

    this.urlResolver = createOfflineCompileUrlResolver();
    this.directiveNormalizer = new DirectiveNormalizer(this.resourceResolver, this.urlResolver, parser, config);

    this.metadataResolver = new CompileMetadataResolver(
            ngModuleResolver, this.directiveResolver, this.pipeResolver, summaryResolver,
            new DomElementSchemaRegistry(), this.directiveNormalizer, this.reflector);
  }
}
