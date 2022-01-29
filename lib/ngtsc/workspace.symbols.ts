import { createProgram, Program, createModuleResolutionCache, TypeChecker, getOriginalNode, Declaration, isIdentifier, isToken } from 'typescript';
import { Type, Expression, WrappedNodeExpr, ExternalExpr } from '@angular/compiler';
import { readConfiguration } from '@angular/compiler-cli';
import { NgCompilerHost } from '@angular/compiler-cli/src/ngtsc/core';
import { NgCompilerOptions } from '@angular/compiler-cli/src/ngtsc/core/api';
import { InjectableDecoratorHandler, PipeDecoratorHandler, DirectiveDecoratorHandler, ReferencesRegistry, NoopReferencesRegistry, NgModuleDecoratorHandler, ComponentDecoratorHandler } from '@angular/compiler-cli/src/ngtsc/annotations';
import { NgtscCompilerHost, FileSystem, LogicalFileSystem, NodeJSFileSystem } from '@angular/compiler-cli/src/ngtsc/file_system';
import { TypeScriptReflectionHost, ClassDeclaration } from '@angular/compiler-cli/src/ngtsc/reflection';
import { PartialEvaluator } from '@angular/compiler-cli/src/ngtsc/partial_evaluator';
import { IncrementalCompilation } from '@angular/compiler-cli/src/ngtsc/incremental';
import {SemanticDepGraphUpdater, SemanticSymbol} from '@angular/compiler-cli/src/ngtsc/incremental/semantic_graph';
import { DefaultImportTracker, ReferenceEmitStrategy, AliasingHost, Reference, ReferenceEmitter, LogicalProjectStrategy, RelativePathStrategy, PrivateExportAliasingHost, LocalIdentifierStrategy, AbsoluteModuleStrategy, AliasStrategy, UnifiedModulesStrategy, UnifiedModulesAliasingHost, ModuleResolver } from '@angular/compiler-cli/src/ngtsc/imports';
import {
  InjectableClassRegistry,
  CompoundMetadataRegistry,
  DtsMetadataReader,
  LocalMetadataRegistry,
  CompoundMetadataReader,
  ResourceRegistry
} from '@angular/compiler-cli/src/ngtsc/metadata';
import {
  MetadataDtsModuleScopeResolver,
  LocalModuleScopeRegistry,
  ComponentScopeReader,
  TypeCheckScopeRegistry,
} from '@angular/compiler-cli/src/ngtsc/scope';
import { getSourceFileOrNull, isDtsPath, isFromDtsFile } from '@angular/compiler-cli/src/ngtsc/util/src/typescript';
import { CycleAnalyzer, ImportGraph, CycleHandlingStrategy } from '@angular/compiler-cli/src/ngtsc/cycles';
import { AdapterResourceLoader } from '@angular/compiler-cli/src/ngtsc/resource';
import { ReferenceGraph } from '@angular/compiler-cli/src/ngtsc/entry_point';
import { DtsTransformRegistry, DecoratorHandler, CompilationMode } from '@angular/compiler-cli/src/ngtsc/transform';
import { PerfRecorder, NOOP_PERF_RECORDER } from '@angular/compiler-cli/src/ngtsc/perf';
import { NgModuleSymbol } from './module.symbol';
import { NgastTraitCompiler } from './trait-compiler';
import { ComponentSymbol } from './component.symbol';
import { symbolFactory, FactoryOutput } from './find-symbol';
import { InjectableSymbol } from './injectable.symbol';
import { DirectiveSymbol } from './directive.symbol';
import { PipeSymbol } from './pipe.symbol';
import { AnnotationNames, getDtsAnnotation, getLocalAnnotation } from './utils';
import { ProviderRegistry } from './provider';
import { dirname, join } from 'path';

interface Toolkit {
  program: Program;
  host: NgCompilerHost;
  traitCompiler: NgastTraitCompiler;
  // Handler
  injectableHandler: InjectableDecoratorHandler;
  pipeHandler: PipeDecoratorHandler;
  directiveHandler: DirectiveDecoratorHandler;
  moduleHandler: NgModuleDecoratorHandler;
  componentHandler: ComponentDecoratorHandler;

  typeCheckScopeRegistry: TypeCheckScopeRegistry;
  resourceRegistry: ResourceRegistry;
  cycleHandlingStrategy: CycleHandlingStrategy;

  checker: TypeChecker;
  reflector: TypeScriptReflectionHost;
  defaultImportTracker: DefaultImportTracker;
  injectableRegistry: InjectableClassRegistry;
  evaluator: PartialEvaluator;
  dtsReader: DtsMetadataReader;
  metaRegistry: CompoundMetadataRegistry;
  scopeRegistry: LocalModuleScopeRegistry;
  metaReader: CompoundMetadataReader;
  aliasingHost: AliasingHost | null;
  localMetaReader: LocalMetadataRegistry;
  refEmitter: ReferenceEmitter;
  referencesRegistry: ReferencesRegistry;
  resourceLoader: AdapterResourceLoader;
  semanticDepGraphUpdater: SemanticDepGraphUpdater;
  moduleResolver: ModuleResolver;
  cycleAnalyzer: CycleAnalyzer;
  incrementalCompilation: IncrementalCompilation;
  dtsTransforms: DtsTransformRegistry;
  // mwpScanner: ModuleWithProvidersScanner;
  providerRegistry: ProviderRegistry;
}

// code from :
// https://github.com/angular/angular/blob/9.1.x/packages/compiler-cli/src/ngtsc/core/src/compiler.ts#L821
class ReferenceGraphAdapter implements ReferencesRegistry {
  constructor(private graph: ReferenceGraph) {}

  add(source: Declaration, ...references: Reference<Declaration>[]): void {
    for (const {node} of references) {
      let sourceFile = node.getSourceFile();
      if (sourceFile === undefined) {
        sourceFile = getOriginalNode(node).getSourceFile();
      }

      // Only record local references (not references into .d.ts files).
      if (sourceFile === undefined || !isDtsPath(sourceFile.fileName)) {
        this.graph.add(source, node);
      }
    }
  }
}

// All the code here comes from the ngtsc Compiler file, for more detail see :
// https://github.com/angular/angular/blob/9.1.x/packages/compiler-cli/src/ngtsc/core/src/compiler.ts

export class WorkspaceSymbols {
  private options: NgCompilerOptions;
  private rootNames: string[];
  private toolkit: Partial<Toolkit> = {};
  private isCore = false;
  private analysed = false;
  private oldProgram: Program;

  constructor(
    private tsconfigPath: string,
    private fs: FileSystem = new NodeJSFileSystem(),
    private perfRecorder: PerfRecorder = NOOP_PERF_RECORDER
  ) {
    const config = readConfiguration(this.tsconfigPath);
    this.options = config.options;
    this.rootNames = config.rootNames;
  }

  /////////////////////////////
  // ------ PUBLIC API ----- //
  /////////////////////////////

  /** Process all classes in the program */
  get traitCompiler() {
    return this.lazy('traitCompiler', () => new NgastTraitCompiler(
        [this.componentHandler, this.directiveHandler as any, this.pipeHandler, this.injectableHandler, this.moduleHandler] as DecoratorHandler<unknown, unknown, SemanticSymbol | null, unknown>[],
        this.reflector,
        this.perfRecorder,
        this.incrementalCompilation,
        this.options.compileNonExportedClasses !== false,
        CompilationMode.FULL,
        this.dtsTransforms,
        this.semanticDepGraphUpdater
      )
    );
  }

  /** Collects information about local NgModules, Directives, Components, and Pipes (declare in the ts.Program) */
  public get scopeRegistry() {
    return this.lazy('scopeRegistry', () => {
      const depScopeReader = new MetadataDtsModuleScopeResolver(this.dtsReader, this.aliasingHost);
      return new LocalModuleScopeRegistry(this.localMetaReader, depScopeReader, this.refEmitter, this.aliasingHost);
    });
  }


  /** Evaluate typescript Expression & update the dependency graph accordingly */
  public get evaluator() {
    return this.lazy('evaluator', () => new PartialEvaluator(
      this.reflector,
      this.checker,
      this.incrementalCompilation.depGraph
    ));
  }

  /** Keep track of the providers other than Injectable */
  get providerRegistry() {
    return this.lazy('providerRegistry', () => new ProviderRegistry(this))
  }

  public getClassRecords() {
    this.ensureAnalysis();
    return this.traitCompiler.allRecords();
  }

  public getAllModules() {
    this.ensureAnalysis();
    return this.traitCompiler.allRecords('NgModule').map(({ node }) => new NgModuleSymbol(this, node));
  }

  public getAllComponents() {
    this.ensureAnalysis();
    return this.traitCompiler.allRecords('Component').map(({ node }) => new ComponentSymbol(this, node));
  }


  public getAllDirectives() {
    this.ensureAnalysis();
    return this.traitCompiler.allRecords('Directive').map(({ node }) => new DirectiveSymbol(this, node));
  }

  public getAllInjectable() {
    this.ensureAnalysis();
    return this.traitCompiler.allRecords('Injectable').map(({ node }) => new InjectableSymbol(this, node));
  }

  public getAllPipes() {
    this.ensureAnalysis();
    return this.traitCompiler.allRecords('Pipe').map(({ node }) => new PipeSymbol(this, node));
  }


  /** Find a symbol based on the class expression */
  public findSymbol(token: Expression | null, relativeTo: string = '') {
    if (token instanceof WrappedNodeExpr) {
      if (isIdentifier(token.node)) {
        const decl = this.reflector.getDeclarationOfIdentifier(token.node);
        if (decl?.node && this.reflector.isClass(decl.node)) {
          return this.getSymbol(decl.node);
        } else if (decl?.node) {
          return this.providerRegistry.getProvider(decl.node);
        }
      } else if (isToken(token.node)) {
        return this.providerRegistry.getProvider(token.node);
      }
    } else if (token instanceof ExternalExpr) {
      const dir = dirname(relativeTo);
      const module = token.value.moduleName ?? '';
      const moduleName = module.endsWith('.ts') ? module : `${module}.ts`;
      const path = join(dir, moduleName);
      return this.getAllInjectable().find(injectable => {
        return injectable.path === path && injectable.name === token.value.name
      });
    }
  }

  /** Find a symbol based on the class expression */
  public getSymbol<A extends AnnotationNames>(node: ClassDeclaration): FactoryOutput<A> | undefined {
    const isDts = isFromDtsFile(node);
    let annotation: AnnotationNames | undefined;
    if (isDts) {
      const members = this.reflector.getMembersOfClass(node);
      annotation = getDtsAnnotation(members);
    } else {
      annotation = getLocalAnnotation(node.decorators);
    }
    if (annotation && (annotation in symbolFactory)) {
      const factory = symbolFactory[annotation];
      return factory(this, node) as FactoryOutput<A>;
    }
  }


  /////////////////////////
  // ----- PRIVATE ----- //
  /////////////////////////

  /** Angular wrapper around the typescript host compiler */
  // TODO: add reusable program
  private get host() {
    return this.lazy('host', () => {
      const baseHost = new NgtscCompilerHost(this.fs, this.options);
      return NgCompilerHost.wrap(baseHost, this.rootNames, this.options, this.oldProgram || null);
    });
  }


  /** Typescript program */
  private get program() {
    return this.lazy('program', () => createProgram({
        host: this.host,
        rootNames: this.host.inputFiles,
        options: this.options
      })
    );
  }


  /** Handler for @Injectable() annotations */
  private get injectableHandler() {
    return this.lazy('injectableHandler', () => new InjectableDecoratorHandler(
        this.reflector,
        this.isCore,
        this.options.strictInjectionParameters || false,
        this.injectableRegistry,
        this.perfRecorder
      )
    );
  }

  /** Handler for @Pipe() annotations */
  private get pipeHandler() {
    return this.lazy('pipeHandler', () => new PipeDecoratorHandler(
        this.reflector,
        this.evaluator,
        this.metaRegistry,
        this.scopeRegistry,
        this.injectableRegistry,
        this.isCore,
        this.perfRecorder
      )
    );
  }

  /** Handler for @Directive() annotations */
  private get directiveHandler() {
    return this.lazy('directiveHandler', () => new DirectiveDecoratorHandler(
        this.reflector,
        this.evaluator,
        this.metaRegistry,
        this.scopeRegistry,
        this.metaReader,
        this.injectableRegistry,
        this.isCore,
        this.semanticDepGraphUpdater,
        !!this.options.annotateForClosureCompiler,
        !!this.options.compileNonExportedClasses,
        this.perfRecorder
      )
    );
  }

  /** Handler for @NgModule() annotations */
  private get moduleHandler() {
    return this.lazy('moduleHandler', () => new NgModuleDecoratorHandler(
        this.reflector,
        this.evaluator,
        this.metaReader,
        this.metaRegistry,
        this.scopeRegistry,
        this.referencesRegistry,
        this.isCore,
        this.refEmitter,
        this.host.factoryTracker,
        !!this.options.annotateForClosureCompiler,
        this.injectableRegistry,
        this.perfRecorder
      )
    );
  }

  /** Handler for @Component() annotations */
  private get componentHandler() {
    return this.lazy('componentHandler', () => new ComponentDecoratorHandler(
        this.reflector,
        this.evaluator,
        this.metaRegistry,
        this.metaReader,
        this.scopeReader,
        this.scopeRegistry,
        this.typeCheckScopeRegistry,
        this.resourceRegistry,
        this.isCore,
        this.resourceLoader,
        this.host.rootDirs,
    this.options.preserveWhitespaces || false,
    this.options.i18nUseExternalIds !== false,
    this.options.enableI18nLegacyMessageIdFormat !== false,
        false,
        this.options.i18nNormalizeLineEndingsInICUs,
        this.moduleResolver,
        this.cycleAnalyzer,
        this.cycleHandlingStrategy,
        this.refEmitter,
        this.incrementalCompilation.depGraph,
        this.injectableRegistry,
        this.semanticDepGraphUpdater,
        !!this.options.annotateForClosureCompiler,
        this.perfRecorder));
  }


  /** Static reflection of declarations using the TypeScript type checker */
  private get reflector() {
    return this.lazy('reflector', () => new TypeScriptReflectionHost(this.checker));
  }

  /** Typescript type checker use to semantically analyze a source file */
  private get checker() {
    return this.lazy('checker', () => this.program.getTypeChecker());
  }

  /** Register metadata from local NgModules, Directives, Components, and Pipes */
  private get metaRegistry() {
    return this.lazy('metaRegistry', () => new CompoundMetadataRegistry([ this.localMetaReader, this.scopeRegistry ]));
  }

  /** Register metadata from local declaration files (.d.ts) */
  private get metaReader() {
    return this.lazy('metaReader', () => new CompoundMetadataReader([ this.localMetaReader, this.dtsReader ]));
  }

  /** Registers and records usages of Identifers that came from default import statements (import X from 'some/module') */
  private get defaultImportTracker() {
    return this.lazy('defaultImportTracker', () => new DefaultImportTracker());
  }

  /** Keeps track of classes that can be constructed via dependency injection (e.g. injectables, directives, pipes) */
  private get injectableRegistry() {
    return this.lazy('injectableRegistry', () => new InjectableClassRegistry(this.reflector));
  }

  // @todo() support oldProgram https://github.com/angular/angular/blob/master/packages/compiler-cli/src/ngtsc/core/src/compiler.ts#L130
  private get incrementalCompilation() {
    return this.lazy('incrementalCompilation', () => IncrementalCompilation.fresh(this.program, null));
  }

  private get typeCheckScopeRegistry() {
    return this.lazy('typeCheckScopeRegistry', () => new TypeCheckScopeRegistry(this.scopeRegistry, this.metaReader));
  }

  private get semanticDepGraphUpdater() {
    return this.lazy('semanticDepGraphUpdater', () => new SemanticDepGraphUpdater(null));
  }

  private get resourceRegistry() {
    return this.lazy('resourceRegistry', () => new ResourceRegistry());
  }

  /** (pre)Load resources using cache */
  private get resourceLoader() {
    return this.lazy('resourceLoader', () => new AdapterResourceLoader(this.host, this.options));
  }

  /** Resolve the module source-files references in lazy-loaded routes */
  private get moduleResolver() {
    return this.lazy('moduleResolver', () => {
      const moduleResolutionCache = createModuleResolutionCache(
        this.host.getCurrentDirectory(),
        fileName => this.host.getCanonicalFileName(fileName)
      );
      return new ModuleResolver(this.program, this.options, this.host, moduleResolutionCache);
    });
  }


  /** Entry source file of the host */
  private get entryPoint() {
    return this.host.entryPoint !== null ? getSourceFileOrNull(this.program, this.host.entryPoint) : null;
  }

  /** Generates and consumes alias re-exports */
  private get aliasingHost() {
    return this.lazy('aliasingHost', () => {
      let aliasingHost: AliasingHost | null = null;
      const { _useHostForImportGeneration, generateDeepReexports } = this.options;
      if (this.host.unifiedModulesHost === null || !_useHostForImportGeneration) {
        if (this.entryPoint === null && generateDeepReexports === true) {
          aliasingHost = new PrivateExportAliasingHost(this.reflector);
        }
      } else {
        aliasingHost = new UnifiedModulesAliasingHost(this.host.unifiedModulesHost);
      }
      return aliasingHost;
    });
  }

  /** Generates `Expression`s which refer to `Reference`s in a given context. */
  private get refEmitter() {
    return this.lazy('refEmitter', () => {
      const { rootDir, rootDirs, _useHostForImportGeneration } = this.options;
      let refEmitter: ReferenceEmitter;
      if (this.host.unifiedModulesHost === null || !_useHostForImportGeneration) {
        let localImportStrategy: ReferenceEmitStrategy;
        if (rootDir !== undefined || rootDirs?.length) {
          localImportStrategy = new LogicalProjectStrategy(
            this.reflector,
            new LogicalFileSystem([ ...this.host.rootDirs ], this.host)
          );
        } else {
          localImportStrategy = new RelativePathStrategy(this.reflector);
        }
        refEmitter = new ReferenceEmitter([
          new LocalIdentifierStrategy(),
          new AbsoluteModuleStrategy(this.program, this.checker, this.moduleResolver, this.reflector),
          localImportStrategy,
        ]);
      } else {
        refEmitter = new ReferenceEmitter([
          new LocalIdentifierStrategy(),
          new AliasStrategy(),
          new UnifiedModulesStrategy(this.reflector, this.host.unifiedModulesHost),
        ]);
      }
      return refEmitter;
    });
  }

  /** A registry of directive, pipe, and module metadata for types defined in the current compilation */
  private get localMetaReader() {
    return this.lazy('localMetaReader', () => new LocalMetadataRegistry());
  }

  /** A `MetadataReader` that can read metadata from `.d.ts` files, which have static Ivy properties */
  private get dtsReader() {
    return this.lazy('dtsReader', () => new DtsMetadataReader(this.checker, this.reflector));
  }

  /** Read information about the compilation scope of components. */
  private get scopeReader() {
    return this.scopeRegistry as ComponentScopeReader;
  }


  /** Used by DecoratorHandlers to register references during analysis */
  private get referencesRegistry() {
    return this.lazy('referencesRegistry', () => {
      let referencesRegistry: ReferencesRegistry;
      if (this.entryPoint !== null) {
        const exportReferenceGraph = new ReferenceGraph();
        referencesRegistry = new ReferenceGraphAdapter(exportReferenceGraph);
      } else {
        referencesRegistry = new NoopReferencesRegistry();
      }
      return referencesRegistry;
    });
  }

  /** Analyzes a `ts.Program` for cycles. */
  private get cycleAnalyzer() {
    return this.lazy('cycleAnalyzer', () => {
      const importGraph = new ImportGraph(this.program.getTypeChecker(), this.perfRecorder);
      return new CycleAnalyzer(importGraph);
    });
  }

  private get cycleHandlingStrategy() {
    return CycleHandlingStrategy.UseRemoteScoping;
  }

  /** Keeps track of declaration transform (`DtsTransform`) per source file */
  private get dtsTransforms() {
    return this.lazy('dtsTransforms', () => new DtsTransformRegistry());
  }

  // /** Scan `ModuleWithProvider` classes */
  // private get mwpScanner() {
  //   return this.lazy('mwpScanner', () => new ModuleWithProvidersScanner(this.reflector, this.evaluator, this.refEmitter));
  // }

  /** Lazy load & memorize every tool in the `WorkspaceSymbols`'s toolkit */
  private lazy<K extends keyof Toolkit>(key: K, load: () => Toolkit[K]): Toolkit[K] {
    if (!this.toolkit[key]) {
      this.toolkit[key] = load();
    }
    return this.toolkit[key] as Toolkit[K];
  }

  /** Perform analysis on all projects */
  private analyzeAll() {
    // Analyse all files
    // const analyzeSpan = this.perfRecorder.start('analyze');

    // TODO
    for (const sf of this.program.getSourceFiles()) {
      if (sf.isDeclarationFile) {
        continue;
      }
      // const analyzeFileSpan = this.perfRecorder.start('analyzeFile', sf);
      this.traitCompiler.analyzeSync(sf);
      // Scan for ModuleWithProvider
      // const addTypeReplacement = (node: Declaration, type: Type): void => {
      //   this.dtsTransforms.getReturnTypeTransform(sf).addTypeReplacement(node, type);
      // };
      // this.mwpScanner.scan(sf, { addTypeReplacement });
      // this.perfRecorder.stop(analyzeFileSpan);
    }
    // this.perfRecorder.stop(analyzeSpan);

    // Resolve compilation
    this.traitCompiler.resolve();

    // Record NgModule Scope dependencies
    // const recordSpan = this.perfRecorder.start('recordDependencies');
    const depGraph = this.incrementalCompilation.depGraph;

    // for (const scope of this.scopeRegistry.getCompilationScopes()) {
    //
    // }
    //
    // for (const scope of this.scopeRegistry.getCompilationScopes()) {
    //   const file = scope.declaration.getSourceFile();
    //   const ngModuleFile = scope.ngModule.getSourceFile();
    //   depGraph.addTransitiveDependency(ngModuleFile, file);
    //   depGraph.addDependency(file, ngModuleFile);
    //   const meta = this.metaReader.getDirectiveMetadata(new Reference<ClassDeclaration<any>>(scope.declaration));
    //   // For components
    //   if (meta !== null && meta.isComponent) {
    //     depGraph.addTransitiveResources(ngModuleFile, file);
    //     for (const directive of scope.directives) {
    //       depGraph.addTransitiveDependency(file, directive.ref.node.getSourceFile());
    //     }
    //     for (const pipe of scope.pipes) {
    //       depGraph.addTransitiveDependency(file, pipe.ref.node.getSourceFile());
    //     }
    //   }
    // }
    // this.perfRecorder.stop(recordSpan);

    // Calculate which files need to be emitted
    this.incrementalCompilation.recordSuccessfulAnalysis(this.traitCompiler);
    this.analysed = true;
  }

  private ensureAnalysis() {
    if (!this.analysed) {
      this.analyzeAll();
      this.providerRegistry.recordAll();
      // TODO: Implements the ProviderRegistry to keep track of FactoryProvider, ValueProvider, ...
    }
  }
}


