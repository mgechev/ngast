import {Program} from 'typescript';

import {UrlResolver} from '@angular/compiler';
import {ContextSymbols} from './context-symbols';
import {ResourceResolver} from './resource-resolver';


/**
 * Interface used for type checking routes gotten from the summary.
 *
 * @export
 * @interface Route
 */
export interface Route {
  path: string;
  loadChildren?: string;
  component?: any;
}


/**
 * Classes implementing this interface should define logic
 * which is responsible for getting the URL to a lazy module.
 * The most primitive `LazyModuleResolver` will simply take the content
 * of the property `loadChildren`. More advanced implementation
 * may parse `System` calls.
 *
 * @export
 * @interface LazyModuleResolver
 */
export interface LazyModuleResolver {

  /**
   * Based on the path of the file containing the route routeDefinition
   * and the route definition itself, this method should return the
   * path of the lazy loaded module.
   *
   * @param {string} basePath
   * @param {Route} routeDefinition
   * @returns {(string | undefined)}
   *
   * @memberOf LazyModuleResolver
   */
  resolve(basePath: string, routeDefinition: Route): string | undefined;
}


/**
 * Implementation of the `LazyModuleResolver` which resolves
 * lazy module URL or path in cases when `loadChildren` has a string value.
 *
 * @export
 * @class BasicLazyModuleResolver
 * @implements {LazyModuleResolver}
 */
export class BasicLazyModuleResolver implements LazyModuleResolver {
  private resolver = new UrlResolver();


  /**
   * Returns URL or path to given lazy loaded module.
   *
   * @param {string} basePath
   * @param {Route} routeDefinition
   * @returns
   *
   * @memberOf BasicLazyModuleResolver
   */
  resolve(basePath: string, routeDefinition: Route) {
    if (typeof routeDefinition.loadChildren === 'string') {
      return this.resolver.resolve(basePath, (routeDefinition.loadChildren.split('#').shift() || '') + '.ts');
    }
    return undefined;
  }
}


/**
 * Classes which implement this interface should be able
 * to create a `ts.Program` based on passed files as arguments.
 *
 * @export
 * @interface ProgramFactory
 */
export interface ProgramFactory {

  /**
   * Creates a `ts.Program` based on some files passed as argument.
   * Usually this method will use external `tsconfig.json` and either
   * override or alter the set of files defined there.
   *
   * @param {string[]} [files]
   * @returns {Program}
   *
   * @memberOf ProgramFactory
   */
  create(files?: string[]): Program;
}


/**
 * This class is a wrapper around an Angular project.
 * It provides access to the root module of the project as well
 * as to it's lazy loaded modules which can be resolved.
 *
 * @export
 * @class ProjectSymbols
 */
export class ProjectSymbols {
  private rootContext: ContextSymbols;


  /**
   * Creates an instance of ProjectSymbols.
   *
   * @param {ProgramFactory} programFactory
   * @param {ResourceResolver} resolver
   * @param {any} [lazyModuleResolver=new BasicLazyModuleResolver()]
   * 
   * @memberOf ProjectSymbols
   */
  constructor(
    private programFactory: ProgramFactory,
    private resolver: ResourceResolver,
    private lazyModuleResolver = new BasicLazyModuleResolver()) {}


  /**
   * Provides access to the `ContextSymbols` corresponding
   * to the root module of the project that is not loaded lazily.
   *
   * @returns {ContextSymbols}
   *
   * @memberOf ProjectSymbols
   */
  getRootContext(): ContextSymbols {
    if (this.rootContext) {
      return this.rootContext;
    }
    const program = this.programFactory.create();
    this.rootContext = new ContextSymbols(program, this.resolver);
    return this.rootContext;
  }


  /**
   * Returns a list of all modules in the project:
   * - All lazy loaded modules
   * - The root module
   *
   * @returns {ContextSymbols[]}
   *
   * @memberOf ProjectSymbols
   */
  getLazyLoadedContexts(): ContextSymbols[] {
    if (!this.rootContext) {
      this.getRootContext();
    }
    const summary = this.rootContext.getContextSummary();
    // If struggles with performance make it more imperative
    const discoverModules = (summary: any) => {
      if (!summary || !summary.type || !summary.type.reference) return [];
      const routes = summary.providers
        .filter(p => 'ANALYZE_FOR_ENTRY_COMPONENTS' === p.provider.token.identifier.reference.name)
        .map(p => p.provider.useValue);
      const contexts: ContextSymbols[] = [].concat.apply([], routes)
        .filter(r => !!r.loadChildren)
        .map(r => this.lazyModuleResolver.resolve(summary.type.reference.filePath, r))
        .filter(r => !!r)
        .map(p => new ContextSymbols(this.programFactory.create([p]), this.resolver));
      return contexts.concat([].concat.apply([], contexts.map(c => c.getContextSummary()).map(discoverModules)));
    };
    return [this.rootContext].concat(discoverModules(summary));
  }
}
