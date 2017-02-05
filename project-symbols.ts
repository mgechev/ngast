import * as ts from 'typescript';

import * as fs from 'fs';
import * as path from 'path';

import {createProgram} from './create-program';

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
  NgAnalyzedModules
} from '@angular/compiler';

import {
  CompilerHost,
  AngularCompilerOptions,
  CompilerHostContext,
  ModuleMetadata,
  NodeCompilerHostContext
} from '@angular/compiler-cli';

export class DummyResourceLoader extends ResourceLoader {
  get(url: string): Promise<string> { return Promise.resolve(''); }
}

export class ProjectSymbols {
  private program: ts.Program;
  private lastProgram: ts.Program;
  private options: AngularCompilerOptions;
  private metadataResolver: CompileMetadataResolver;
  private staticSymbolResolver: StaticSymbolResolver;
  private analyzedModules: NgAnalyzedModules;

  constructor(private configFilePath: string) {
    this.program = createProgram(this.configFilePath);
    this.options = this.program.getCompilerOptions();
    this.init();
  }

  getAnalyzedModules(): NgAnalyzedModules {
    this.validate();
    return this.ensureAnalyzedModules();
  }

  extractProgramSymbols() {
    return extractProgramSymbols(
      this.staticSymbolResolver, this.program.getSourceFiles().map(sf => sf.fileName), {
        isSourceFile() { return true; }
      });
  }

  getDirectives() {
    // this.metadataResolver.loadNgModuleDirectiveAndPipeMetadata()
    return this.extractProgramSymbols()
      .filter((v => this.metadataResolver.isDirective(v)))
      .map((v => this.metadataResolver.getNonNormalizedDirectiveMetadata(v)));
  }

  getNgModules() {
    return this.extractProgramSymbols()
      .filter((v => this.metadataResolver.getNgModuleMetadata(v)));
  }

  updateProgram(program: ts.Program) {
    if (program !== this.program) {
      this.program = program;
      this.validate();
    }
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

    const normalizer = new DirectiveNormalizer(new DummyResourceLoader(), createOfflineCompileUrlResolver(), parser, config);

    const staticResolverHost = new CompilerHost(this.program, this.options, new NodeCompilerHostContext());

    this.staticSymbolResolver = new StaticSymbolResolver(
            staticResolverHost, staticSymbolCache, summaryResolver,
            (e, filePath) => {
              console.log(e, filePath);
            });

    const reflector = new StaticReflector(
          this.staticSymbolResolver, [], [], (e, filePath) => {
              console.log(e, filePath);
            });

    const ngModuleResolver = new NgModuleResolver(reflector);
    const dirResolver = new DirectiveResolver(reflector);
    const pipeResolver = new PipeResolver(reflector);

    const directiveNormalizer = new DirectiveNormalizer(new DummyResourceLoader(), new UrlResolver(), parser, config);

    this.metadataResolver = new CompileMetadataResolver(
            ngModuleResolver, dirResolver, pipeResolver, new SummaryResolver(),
            new DomElementSchemaRegistry(), directiveNormalizer, reflector);

    return this.staticSymbolResolver;
  }
}
