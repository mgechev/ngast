import * as ts from 'typescript';

import { ResourceResolver } from './resource-resolver';

import { ViewEncapsulation } from '@angular/core';
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
  AotCompiler,
  StyleCompiler,
  NgModuleCompiler,
  TypeScriptEmitter,
  ViewCompiler,
  TemplateParser,
  Lexer,
  Parser,
  CompileProviderMetadata
} from '@angular/compiler';

import { MetadataCollector, readConfiguration, CompilerOptions, CompilerHost } from '@angular/compiler-cli';
import { PipeSymbol } from './pipe-symbol';
import { DirectiveSymbol } from './directive-symbol';
import { ModuleSymbol } from './module-symbol';
import { ProviderSymbol } from './provider-symbol';
import { TsCompilerAotCompilerTypeCheckHostAdapter } from '@angular/compiler-cli/src/transformers/compiler_host';
import { InjectableCompiler } from '@angular/compiler/src/injectable_compiler';
import { TypeCheckCompiler } from '@angular/compiler/src/view_compiler/type_check_compiler';

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
  private program: ts.Program;
  private compilerHost: CompilerHost;
  private analyzedModules: NgAnalyzedModules;
  private options: CompilerOptions;
  private compiler: AotCompiler;

  /**
   * Creates an instance of ProjectSymbols.
   *
   * @param {ts.Program} program
   * @param {ResourceResolver} resourceResolver
   *
   * @memberOf ProjectSymbols
   */
  constructor(
    private tsconfigPath: string,
    private resourceResolver: ResourceResolver,
    private errorReporter: ErrorReporter
  ) {
    const config = readConfiguration(this.tsconfigPath);
    this.options = config.options;
    this.init(this.options, config.rootNames);
  }

  /**
   * Returns the metadata associated to this module.
   *
   * @returns {ModuleSymbol[]}
   *
   * @memberOf ProjectSymbols
   */
  getModules(): ModuleSymbol[] {
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
   * Returns directive based on `ClassDeclaration` node and a filename.
   *
   * @param {ts.ClassDeclaration} declaration
   * @param {string} fileName
   *
   * @memberOf DirectiveSymbol
   */
  getDirectiveFromNode(declaration: ts.ClassDeclaration, fileName: string) {
    const sourceFile = this.program.getSourceFile(fileName);
    if (!sourceFile) {
      throw new Error(`Cannot get the program's source file`);
    }
    const identifier = declaration.name;
    if (identifier) {
      return new DirectiveSymbol(
        this.program,
        this.reflector.getStaticSymbol(sourceFile.fileName, identifier.text),
        this.metadataResolver,
        this.directiveNormalizer,
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

      // The root filenames may not contain a module itself, but only reference one (f.e. main.ts)
      const filenames = this.program.getSourceFiles().map(sf => sf.fileName);
      analyzedModules = this.analyzedModules = analyzeNgModules(
        filenames,
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
      this.program
        .getSourceFiles()
        .filter(f => this.staticSymbolResolver.hasDecorators(f.fileName))
        .map(f => this.staticSymbolResolver.getSymbolsOf(f.fileName))
    );
  }

  // private clearCaches() {
  //   this.metadataResolver.clearCache();
  //   this.directiveNormalizer.clearCache();
  // }

  private init(options: ts.CompilerOptions, rootNames: string[]) {
    this.compilerHost = ts.createCompilerHost(this.options, true);
    // Replace all `\` with a forward slash to align with typescript's `normalizePath`.
    // On Windows, different slashes cause errors while trying to compare module symbols
    rootNames = rootNames.map(rootName => rootName.replace(/\\/g, '/'));

    this.staticResolverHost = new TsCompilerAotCompilerTypeCheckHostAdapter(
      rootNames,
      this.options,
      this.compilerHost,
      new MetadataCollector(),
      {
        generateFile: (genFileName, baseFileName) => {
          return this.compiler.emitBasicStub(genFileName, baseFileName);
        },
        findGeneratedFileNames: fileName => {
          return this.compiler.findGeneratedFileNames(fileName);
        }
      }
    );

    this.urlResolver = createOfflineCompileUrlResolver();
    const symbolCache = new StaticSymbolCache();
    this.summaryResolver = new AotSummaryResolver(this.staticResolverHost, symbolCache);
    this.staticSymbolResolver = new StaticSymbolResolver(this.staticResolverHost, symbolCache, this.summaryResolver);
    this.reflector = new StaticReflector(this.summaryResolver, this.staticSymbolResolver, [], []);
    const htmlParser = new HtmlParser();
    const config = new CompilerConfig({
      defaultEncapsulation: ViewEncapsulation.Emulated,
      useJit: false
    });
    this.pipeResolver = new PipeResolver(this.reflector);
    this.directiveResolver = new DirectiveResolver(this.reflector);
    this.directiveNormalizer = new DirectiveNormalizer(
      {
        get: (url) => {
          return this.staticResolverHost.loadResource(url);
        }
      },
      this.urlResolver,
      htmlParser,
      config
    );
    const registry = new DomElementSchemaRegistry();
    this.metadataResolver = new CompileMetadataResolver(
      config,
      htmlParser,
      new NgModuleResolver(this.reflector),
      this.directiveResolver,
      this.pipeResolver,
      this.summaryResolver,
      registry,
      this.directiveNormalizer,
      console,
      symbolCache,
      this.reflector
    );
    const viewCompiler = new ViewCompiler(this.reflector);
    const typeCheckCompiler = new TypeCheckCompiler(options, this.reflector);
    var expressionParser = new Parser(new Lexer());
    var tmplParser = new TemplateParser(config, this.reflector, expressionParser, registry, htmlParser, console, []);
    this.compiler = new AotCompiler(
      config,
      options,
      this.staticResolverHost,
      this.reflector,
      this.metadataResolver,
      tmplParser,
      new StyleCompiler(this.urlResolver),
      viewCompiler,
      typeCheckCompiler,
      new NgModuleCompiler(this.reflector),
      new InjectableCompiler(this.reflector, !!options.enableIvy),
      new TypeScriptEmitter(),
      this.summaryResolver,
      this.staticSymbolResolver
    );
    this.program = ts.createProgram({ rootNames, options: options, host: this.staticResolverHost });
  }
}
