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
  CompileNgModuleSummary
} from '@angular/compiler';

import {
  CompilerHost,
  AngularCompilerOptions,
  NodeCompilerHostContext
} from '@angular/compiler-cli';

import {PipeSymbol} from './pipe-symbol';
import {DirectiveSymbol} from './directive-symbol';


/**
 * Creates a proxy which provides us access to the symbols
 * defined in given context (could be lazy loaded module or the root module).
 *
 * @export
 * @class ContextSymbols
 */
export class ContextSymbols {
  private metadataResolver: CompileMetadataResolver;
  private reflector: StaticReflector;
  private staticSymbolResolver: StaticSymbolResolver;
  private staticResolverHost: CompilerHost;
  private pipeResolver: PipeResolver;
  private directiveResolver: DirectiveResolver;
  private urlResolver: UrlResolver;
  private directiveNormalizer: DirectiveNormalizer;
  private lastProgram: ts.Program;
  private options: AngularCompilerOptions;
  private analyzedModules: NgAnalyzedModules;


  /**
   * Creates an instance of ContextSymbols.
   *
   * @param {ts.Program} program
   * @param {ResourceResolver} resourceResolver
   *
   * @memberOf ContextSymbols
   */
  constructor(private program: ts.Program,
     private resourceResolver: ResourceResolver) {
    this.options = this.program.getCompilerOptions();
    this.init();
  }


  /**
   * Returns the metadata associated to this module.
   *
   * @returns {CompileNgModuleMetadata[]}
   *
   * @memberOf ContextSymbols
   */
  getModules(): CompileNgModuleMetadata[] {
    this.validate();
    const result: CompileNgModuleMetadata[] = [];
    this.getAnalyzedModules()
      .ngModuleByPipeOrDirective
      .forEach((m, s) => {
        result.push(m);
      });
    return result;
  }


  /**
   * Returns all the directives available in the context.
   *
   * @returns {DirectiveSymbol[]}
   *
   * @memberOf ContextSymbols
   */
  getDirectives(): DirectiveSymbol[] {
    return this.extractProgramSymbols()
      .filter(symbol => this.metadataResolver.isDirective(symbol))
      .map(symbol => new DirectiveSymbol(
        this.program,
        symbol,
        this.metadataResolver,
        this.directiveNormalizer,
        this.directiveResolver,
        this.reflector,
        this.resourceResolver,
        this
      ));
  }


  /**
   * Returns all the pipes available in this module.
   * 
   * @returns {PipeSymbol[]}
   * 
   * @memberOf ContextSymbols
   */
  getPipes(): PipeSymbol[] {
    return this.extractProgramSymbols()
      .filter(v => this.metadataResolver.isPipe(v))
      .map(p => new PipeSymbol(this.program, p, this.pipeResolver, this));
  }


  /**
   * Returns the summary of this context.
   *
   * @returns {(CompileNgModuleSummary | undefined)}
   *
   * @memberOf ContextSymbols
   */
  getContextSummary(): CompileNgModuleSummary | undefined {
    const module = this.getModules().pop();
    if (module) {
      return this.metadataResolver.getNgModuleSummary(module.type.reference);
    }
    return undefined;
  }


  /**
   * Updates the program which has impact over the loaded symbols.
   * In case the `udpate` method is called with program different from
   * the current one, all the internal caches will be cleared.
   *
   * @param {ts.Program} program
   *
   * @memberOf ContextSymbols
   */
  updateProgram(program: ts.Program): void {
    if (program !== this.program) {
      this.program = program;
      this.validate();
    }
  }

  /** @internal */
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
    this.metadataResolver.clearCache();
    this.directiveNormalizer.clearCache();
  }

  private init() {
    const staticSymbolCache = new StaticSymbolCache();

    const summaryResolver = new AotSummaryResolver({
      loadSummary(filePath: string) { return ''; },
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
            // The strict null check gets confused here
            (this.staticResolverHost as any), staticSymbolCache, summaryResolver,
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
