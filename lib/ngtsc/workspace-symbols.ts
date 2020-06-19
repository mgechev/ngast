import { createProgram, Program, createModuleResolutionCache, TypeChecker, getOriginalNode, Declaration } from 'typescript';
import { readConfiguration } from '@angular/compiler-cli';
import { NgCompilerHost } from '@angular/compiler-cli/src/ngtsc/core';
import { NgCompilerOptions } from '@angular/compiler-cli/src/ngtsc/core/api';
import { InjectableDecoratorHandler, PipeDecoratorHandler, DirectiveDecoratorHandler, ReferencesRegistry, NoopReferencesRegistry, NgModuleDecoratorHandler, ComponentDecoratorHandler } from '@angular/compiler-cli/src/ngtsc/annotations';
import { NgtscCompilerHost, FileSystem, LogicalFileSystem, NodeJSFileSystem } from '@angular/compiler-cli/src/ngtsc/file_system';
import { TypeScriptReflectionHost } from '@angular/compiler-cli/src/ngtsc/reflection';
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

interface Toolkit {
  program: Program;
  host: NgCompilerHost;
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
  scopeReader: ComponentScopeReader;
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
}

type ToolkitRecord = Partial<{
  [key in keyof Toolkit]: Toolkit[key]
}>;

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



export class WorkspaceSymbols {
  private options: NgCompilerOptions;
  private rootNames: string[];
  private toolkit: ToolkitRecord = {};
  private isCore = false;

  constructor(
    private tsconfigPath: string,
    private fs: FileSystem = new NodeJSFileSystem(),
  ) {
    const config = readConfiguration(this.tsconfigPath);
    this.options = config.options;
    this.rootNames = config.rootNames;
  }


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


  private get checker() {
    return this.lazy('checker', () => this.program.getTypeChecker());
  }

  private get reflector() {
    return this.lazy('reflector', () => new TypeScriptReflectionHost(this.checker));
  }

  private get defaultImportTracker() {
    return this.lazy('defaultImportTracker', () => new DefaultImportTracker());
  }

  private get injectableRegistry() {
    return this.lazy('injectableRegistry', () => new InjectableClassRegistry(this.reflector));
  }

  private get incrementalDriver() {
    return this.lazy('incrementalDriver', () => {
      // @todo() support oldProgram https://github.com/angular/angular/blob/master/packages/compiler-cli/src/ngtsc/core/src/compiler.ts#L130
      const incrementalDriver = IncrementalDriver.fresh(this.program);
      return incrementalDriver;
    });
  }

  private get evaluator() {
    return this.lazy('evaluator', () => new PartialEvaluator(
      this.reflector,
      this.checker,
      this.incrementalDriver.depGraph
    ));
  }

  private get resourceManager() {
    return this.lazy('resourceManager', () => new HostResourceLoader(this.host, this.options));
  }

  private get moduleResolver() {
    return this.lazy('moduleResolver', () => {
      const moduleResolutionCache = createModuleResolutionCache(
        this.host.getCurrentDirectory(),
        fileName => this.host.getCanonicalFileName(fileName)
      );
      return new ModuleResolver(this.program, this.options, this.host, moduleResolutionCache);
    });
  }

  private get entryPoint() {
    return this.host.entryPoint !== null ? getSourceFileOrNull(this.program, this.host.entryPoint) : null;
  }

  private get aliasingHost() {
    return this.lazy('aliasingHost', () => {
      let aliasingHost: AliasingHost | null = null;
      const { rootDir, rootDirs, _useHostForImportGeneration, generateDeepReexports } = this.options;
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

  private get localMetaReader() {
    return this.lazy('localMetaReader', () => new LocalMetadataRegistry());
  }

  private get dtsReader() {
    return this.lazy('dtsReader', () => new DtsMetadataReader(this.checker, this.reflector));
  }

  private get scopeReader() {
    return this.lazy('scopeReader', () => {
      const depScopeReader = new MetadataDtsModuleScopeResolver(this.dtsReader, this.aliasingHost);
      return new LocalModuleScopeRegistry(this.localMetaReader, depScopeReader, this.refEmitter, this.aliasingHost);
    });
  }

  // alias of scopeReader
  private get scopeRegistry() {
    return this.scopeReader as LocalModuleScopeRegistry;
  }

  private get metaRegistry() {
    return this.lazy('metaRegistry', () => new CompoundMetadataRegistry([ this.localMetaReader, this.scopeRegistry ]));
  }

  private get metaReader() {
    return this.lazy('metaReader', () => new CompoundMetadataReader([ this.localMetaReader, this.dtsReader ]));
  }

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

  private get routeAnalyzer() {
    return this.lazy('routeAnalyzer', () => new NgModuleRouteAnalyzer(this.moduleResolver, this.evaluator));
  }

  private get cycleAnalyzer() {
    return this.lazy('cycleAnalyzer', () => {
      const importGraph = new ImportGraph(this.moduleResolver);
      return new CycleAnalyzer(importGraph);
    });
  }


  private lazy<K extends keyof ToolkitRecord>(key: K, load: () => ToolkitRecord[K]): ToolkitRecord[K] {
    if (!this.toolkit[key]) {
      this.toolkit[key] = load();
    }
    return this.toolkit[key];
  }
}


