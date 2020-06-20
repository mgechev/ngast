import { createProgram, Program, createModuleResolutionCache, TypeChecker, getOriginalNode, Declaration } from 'typescript';
import { Type } from '@angular/compiler';
import { readConfiguration } from '@angular/compiler-cli';
import { NgCompilerHost } from '@angular/compiler-cli/src/ngtsc/core';
import { NgCompilerOptions } from '@angular/compiler-cli/src/ngtsc/core/api';
import { InjectableDecoratorHandler, PipeDecoratorHandler, DirectiveDecoratorHandler, ReferencesRegistry, NoopReferencesRegistry, NgModuleDecoratorHandler, ComponentDecoratorHandler } from '@angular/compiler-cli/src/ngtsc/annotations';
import { NgtscCompilerHost, FileSystem, LogicalFileSystem, NodeJSFileSystem } from '@angular/compiler-cli/src/ngtsc/file_system';
import { TypeScriptReflectionHost, ClassDeclaration } from '@angular/compiler-cli/src/ngtsc/reflection';
import { PartialEvaluator } from '@angular/compiler-cli/src/ngtsc/partial_evaluator';
import { IncrementalDriver } from '@angular/compiler-cli/src/ngtsc/incremental';
import { DefaultImportTracker, ReferenceEmitStrategy, AliasingHost, Reference, ReferenceEmitter, LogicalProjectStrategy, RelativePathStrategy, PrivateExportAliasingHost, LocalIdentifierStrategy, AbsoluteModuleStrategy, AliasStrategy, UnifiedModulesStrategy, UnifiedModulesAliasingHost, ModuleResolver } from '@angular/compiler-cli/src/ngtsc/imports';
import { InjectableClassRegistry, CompoundMetadataRegistry, DtsMetadataReader, LocalMetadataRegistry, CompoundMetadataReader } from '@angular/compiler-cli/src/ngtsc/metadata';
import { MetadataDtsModuleScopeResolver, LocalModuleScopeRegistry, ComponentScopeReader } from '@angular/compiler-cli/src/ngtsc/scope';
import { getSourceFileOrNull, isDtsPath } from '@angular/compiler-cli/src/ngtsc/util/src/typescript';
import { NgModuleRouteAnalyzer } from '@angular/compiler-cli/src/ngtsc/routing';
import { CycleAnalyzer, ImportGraph } from '@angular/compiler-cli/src/ngtsc/cycles';
import { HostResourceLoader } from '@angular/compiler-cli/src/ngtsc/resource';
import { ReferenceGraph } from '@angular/compiler-cli/src/ngtsc/entry_point';
import { TraitCompiler, DtsTransformRegistry, ClassRecord } from '@angular/compiler-cli/src/ngtsc/transform';
import { PerfRecorder, NOOP_PERF_RECORDER } from '@angular/compiler-cli/src/ngtsc/perf';
import { ModuleWithProvidersScanner } from '@angular/compiler-cli/src/ngtsc/modulewithproviders';
import { AnnotationNames, hasDecoratorName } from './utils';
import { ModuleSymbol } from './module.symbol';

interface Toolkit {
  program: Program;
  host: NgCompilerHost;
  traitCompiler: NgastCompiler;
  // Handler
  injectableHandler: InjectableDecoratorHandler;
  pipeHandler: PipeDecoratorHandler;
  directiveHandler: DirectiveDecoratorHandler;
  moduleHandler: NgModuleDecoratorHandler;
  cmptHandler: ComponentDecoratorHandler;

  checker: TypeChecker;
  reflector: TypeScriptReflectionHost;
  defaultImportTracker: DefaultImportTracker;
  injectableRegistry: InjectableClassRegistry;
  evaluator: PartialEvaluator;
  dtsReader: DtsMetadataReader;
  metaRegistry: CompoundMetadataRegistry;
  scopeRegistry: LocalModuleScopeRegistry;
  metaReader: CompoundMetadataReader;
  aliasingHost: AliasingHost;
  localMetaReader: LocalMetadataRegistry;
  refEmitter: ReferenceEmitter;
  referencesRegistry: ReferencesRegistry;
  routeAnalyzer: NgModuleRouteAnalyzer;

  resourceManager: HostResourceLoader;
  moduleResolver: ModuleResolver;
  cycleAnalyzer: CycleAnalyzer;
  incrementalDriver: IncrementalDriver;
  dtsTransforms: DtsTransformRegistry;
  mwpScanner: ModuleWithProvidersScanner;
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

/** TraitCompiler with friendly interface */
export class NgastCompiler extends TraitCompiler {

  /** Perform analysis for one node */
  async analyzeNode(node: ClassDeclaration<Declaration>) {
    this.analyzeClass(node, null);
  }

  allRecords(annotation?: AnnotationNames) {
    const records: ClassRecord[] = [];
    this.fileToClasses.forEach(nodes => {
      nodes.forEach(node => {
        const record = this.recordFor(node);
        if (record) {
          // If an annotation is given return only the expected annotated node
          if (!annotation || (annotation && hasDecoratorName(record.node, annotation))) {
            records.push(record);
          }
        }
      });
    });
    return records;
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

  constructor(
    private tsconfigPath: string,
    private fs: FileSystem = new NodeJSFileSystem(),
    private perfRecorder: PerfRecorder = NOOP_PERF_RECORDER
  ) {
    const config = readConfiguration(this.tsconfigPath);
    this.options = config.options;
    this.rootNames = config.rootNames;
  }

  // ------ PUBLIC API ----- //

  /** Angular wrapper around the typescript host compiler */
  get host() {
    return this.lazy('host', () => {
      const baseHost = new NgtscCompilerHost(this.fs, this.options);
      return NgCompilerHost.wrap(baseHost, this.rootNames, this.options);
    });
  }


  /** Typescript program */
  get program() {
    return this.lazy('program', () => createProgram({
        host: this.host,
        rootNames: this.host.inputFiles,
        options: this.options
      })
    );
  }

  /** Process all classes in the program */
  get traitCompiler() {
    return this.lazy('traitCompiler', () => new NgastCompiler(
        [this.cmptHandler, this.directiveHandler, this.pipeHandler, this.injectableHandler, this.moduleHandler],
        this.reflector,
        this.perfRecorder,
        this.incrementalDriver,
        this.options.compileNonExportedClasses !== false,
        this.dtsTransforms
      )
    );
  }

  /** Handler for @Injectable() annotations */
  get injectableHandler() {
    return this.lazy('injectableHandler', () => new InjectableDecoratorHandler(
        this.reflector,
        this.defaultImportTracker,
        this.isCore,
        this.options.strictInjectionParameters || false,
        this.injectableRegistry
      )
    );
  }

  /** Handler for @Pipe() annotations */
  get pipeHandler() {
    return this.lazy('pipeHandler', () => new PipeDecoratorHandler(
        this.reflector,
        this.evaluator,
        this.metaRegistry,
        this.scopeRegistry,
        this.defaultImportTracker,
        this.injectableRegistry,
        this.isCore
      )
    );
  }

  /** Handler for @Directive() annotations */
  get directiveHandler() {
    return this.lazy('directiveHandler', () => new DirectiveDecoratorHandler(
        this.reflector,
        this.evaluator,
        this.metaRegistry,
        this.scopeRegistry,
        this.metaReader,
        this.defaultImportTracker,
        this.injectableRegistry,
        this.isCore,
        this.options.annotateForClosureCompiler
      )
    );
  }

  /** Handler for @NgModule() annotations */
  get moduleHandler() {
    return this.lazy('moduleHandler', () => new NgModuleDecoratorHandler(
        this.reflector,
        this.evaluator,
        this.metaReader,
        this.metaRegistry,
        this.scopeRegistry,
        this.referencesRegistry,
        this.isCore,
        this.routeAnalyzer,
        this.refEmitter,
        this.host.factoryTracker,
        this.defaultImportTracker,
        this.options.annotateForClosureCompiler,
        this.injectableRegistry,
        this.options.i18nInLocale
      )
    );
  }

  /** Handler for @Component() annotations */
  get cmptHandler() {
    return this.lazy('cmptHandler', () => new ComponentDecoratorHandler(
        this.reflector,
        this.evaluator,
        this.metaRegistry,
        this.metaReader,
        this.scopeReader,
        this.scopeRegistry,
        this.isCore,
        this.resourceManager,
        this.host.rootDirs,
        this.options.preserveWhitespaces || false,
        this.options.i18nUseExternalIds !== false,
        this.options.enableI18nLegacyMessageIdFormat !== false,
        this.moduleResolver,
        this.cycleAnalyzer,
        this.refEmitter,
        this.defaultImportTracker,
        this.incrementalDriver.depGraph,
        this.injectableRegistry,
        this.options.annotateForClosureCompiler,
      )
    );
  }

  /** Register metadata from local NgModules, Directives, Components, and Pipes */
  public get metaRegistry() {
    return this.lazy('metaRegistry', () => new CompoundMetadataRegistry([ this.localMetaReader, this.scopeRegistry ]));
  }

  /** Register metadata from local declaration files (.d.ts) */
  public get metaReader() {
    return this.lazy('metaReader', () => new CompoundMetadataReader([ this.localMetaReader, this.dtsReader ]));
  }
  
  /** Collects information about local NgModules, Directives, Components, and Pipes (declare in the ts.Program) */
  public get scopeRegistry() {
    return this.lazy('scopeRegistry', () => {
      const depScopeReader = new MetadataDtsModuleScopeResolver(this.dtsReader, this.aliasingHost);
      return new LocalModuleScopeRegistry(this.localMetaReader, depScopeReader, this.refEmitter, this.aliasingHost);
    });
  }


  public getAllModules() {
    this.ensureAnalysis();
    return this.traitCompiler.allRecords('NgModule').map(({ node }) => new ModuleSymbol(this, node));
  }

  /** Perform analysis on all projects */
  private analyzeAll() {
    // Analyse all files
    const analyzeSpan = this.perfRecorder.start('analyze');
    for (const sf of this.program.getSourceFiles()) {
      if (sf.isDeclarationFile) {
        continue;
      }
      const analyzeFileSpan = this.perfRecorder.start('analyzeFile', sf);
      this.traitCompiler.analyzeSync(sf);
      const addTypeReplacement = (node: Declaration, type: Type): void => {
        this.dtsTransforms.getReturnTypeTransform(sf).addTypeReplacement(node, type);
      };
      this.mwpScanner.scan(sf, { addTypeReplacement });
      this.perfRecorder.stop(analyzeFileSpan);
    }
    this.perfRecorder.stop(analyzeSpan);
    this.traitCompiler.resolve();

    // Record NgModule Scope Dependancies
    const recordSpan = this.perfRecorder.start('recordDependencies');
    const depGraph = this.incrementalDriver.depGraph;
    for (const scope of this.scopeRegistry.getCompilationScopes()) {
      const file = scope.declaration.getSourceFile();
      const ngModuleFile = scope.ngModule.getSourceFile();
      depGraph.addTransitiveDependency(ngModuleFile, file);
      depGraph.addDependency(file, ngModuleFile);
      const meta = this.metaReader.getDirectiveMetadata(new Reference(scope.declaration));
      // For components
      if (meta !== null && meta.isComponent) {
        depGraph.addTransitiveResources(ngModuleFile, file);
        for (const directive of scope.directives) {
          depGraph.addTransitiveDependency(file, directive.ref.node.getSourceFile());
        }
        for (const pipe of scope.pipes) {
          depGraph.addTransitiveDependency(file, pipe.ref.node.getSourceFile());
        }
      }
    }
    this.perfRecorder.stop(recordSpan);

    // Calculate which files need to be emitted
    this.incrementalDriver.recordSuccessfulAnalysis(this.traitCompiler);
    this.analysed = true;
  }



  // ----- PRIVATE ----- //

  /** Typescript type checker use to semantically analyze a source file */
  private get checker() {
    return this.lazy('checker', () => this.program.getTypeChecker());
  }

  /** Static reflection of declarations using the TypeScript type checker */
  private get reflector() {
    return this.lazy('reflector', () => new TypeScriptReflectionHost(this.checker));
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
  private get incrementalDriver() {
    return this.lazy('incrementalDriver', () => IncrementalDriver.fresh(this.program));
  }

  /** Evaluate typecript Expression & update the dependancy graph accordingly */
  private get evaluator() {
    return this.lazy('evaluator', () => new PartialEvaluator(
      this.reflector,
      this.checker,
      this.incrementalDriver.depGraph
    ));
  }

  /** (pre)Load resources using cache */
  private get resourceManager() {
    return this.lazy('resourceManager', () => new HostResourceLoader(this.host, this.options));
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
            new LogicalFileSystem([ ...this.host.rootDirs ])
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

  /** Analyze lazy loaded routes */
  private get routeAnalyzer() {
    return this.lazy('routeAnalyzer', () => new NgModuleRouteAnalyzer(this.moduleResolver, this.evaluator));
  }

  /** Analyzes a `ts.Program` for cycles. */
  private get cycleAnalyzer() {
    return this.lazy('cycleAnalyzer', () => {
      const importGraph = new ImportGraph(this.moduleResolver);
      return new CycleAnalyzer(importGraph);
    });
  }

  /** Keeps track of declaration transform (`DtsTransform`) per source file */
  private get dtsTransforms() {
    return this.lazy('dtsTransforms', () => new DtsTransformRegistry());
  }

  /** Scan `ModuleWithProvider` classes */
  private get mwpScanner() {
    return this.lazy('mwpScanner', () => new ModuleWithProvidersScanner(this.reflector, this.evaluator, this.refEmitter));
  }

  /** Lazy load & memorize every tool in the `WorkspaceSymbols`'s toolkit */
  private lazy<K extends keyof Toolkit>(key: K, load: () => Toolkit[K]): Partial<Toolkit>[K] {
    if (!this.toolkit[key]) {
      this.toolkit[key] = load();
    }
    return this.toolkit[key];
  }

  private ensureAnalysis() {
    if (!this.analysed) {
      this.analyzeAll();
    }
  }
}


