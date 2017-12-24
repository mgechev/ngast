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

import { MetadataCollector, readConfiguration, CompilerOptions } from '@angular/compiler-cli';
import { createCompilerHost, createProgram, CompilerHost, Program } from '@angular/compiler-cli/ngtools2';

import { PipeSymbol } from './pipe-symbol';
import { DirectiveSymbol } from './directive-symbol';
import { ModuleSymbol } from './module-symbol';
import { ProviderSymbol } from './provider-symbol';
import { CompileProviderMetadata } from '@angular/compiler';
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
  private program: Program;
  private compilerHost: CompilerHost;
  private analyzedModules: NgAnalyzedModules;
  private options: CompilerOptions;

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
    this.compilerHost = createCompilerHost({ options: config.options });
    this.program = createProgram({ rootNames: config.rootNames, options: config.options, host: this.compilerHost });
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
    this.clearCaches();
    this.init();
    const resultMap: Map<StaticSymbol, CompileNgModuleMetadata> = new Map();
    this.getAnalyzedModules().ngModules.forEach((m, s) => {
      resultMap.set(m.type.reference, m);
    });
    const result: ModuleSymbol[] = [];
    resultMap.forEach(v =>
      result.push(
        new ModuleSymbol(
          this.program.getTsProgram(),
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
            this.program.getTsProgram(),
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
      .map(p => new PipeSymbol(this.program.getTsProgram(), p, this.pipeResolver, this.metadataResolver, this));
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
    const sourceFile = this.program.getTsProgram().getSourceFile(fileName);
    const identifier = declaration.name;
    if (identifier) {
      return new DirectiveSymbol(
        this.program.getTsProgram(),
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
        this.program.getTsProgram().getRootFileNames(),
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
        .getTsProgram()
        .getSourceFiles()
        .map(f => this.staticSymbolResolver.getSymbolsOf(f.fileName))
    );
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

    const defaultDir = this.program.getTsProgram().getCurrentDirectory();
    this.options.baseUrl = this.options.baseUrl || defaultDir;
    this.options.basePath = this.options.basePath || defaultDir;
    this.options.genDir = this.options.genDir || defaultDir;

    this.staticResolverHost = new TsCompilerAotCompilerTypeCheckHostAdapter(
      this.program.getTsProgram().getRootFileNames(),
      this.options,
      this.compilerHost,
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
