import { UrlResolver } from '@angular/compiler';
import { ContextSymbols } from './context-symbols';
/**
 * Implementation of the `LazyModuleResolver` which resolves
 * lazy module URL or path in cases when `loadChildren` has a string value.
 *
 * @export
 * @class BasicLazyModuleResolver
 * @implements {LazyModuleResolver}
 */
export class BasicLazyModuleResolver {
    constructor() {
        this.resolver = new UrlResolver();
    }
    /**
     * Returns URL or path to given lazy loaded module.
     *
     * @param {string} basePath
     * @param {Route} routeDefinition
     * @returns
     *
     * @memberOf BasicLazyModuleResolver
     */
    resolve(basePath, routeDefinition) {
        if (typeof routeDefinition.loadChildren === 'string') {
            return this.resolver.resolve(basePath, (routeDefinition.loadChildren.split('#').shift() || '') + '.ts');
        }
        return undefined;
    }
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
    /**
     * Creates an instance of ProjectSymbols.
     *
     * @param {ProgramFactory} programFactory
     * @param {ResourceResolver} resolver
     * @param {any} [lazyModuleResolver=new BasicLazyModuleResolver()]
     *
     * @memberOf ProjectSymbols
     */
    constructor(programFactory, resolver, lazyModuleResolver = new BasicLazyModuleResolver()) {
        this.programFactory = programFactory;
        this.resolver = resolver;
        this.lazyModuleResolver = lazyModuleResolver;
    }
    /**
     * Provides access to the `ContextSymbols` corresponding
     * to the root module of the project that is not loaded lazily.
     *
     * @returns {ContextSymbols}
     *
     * @memberOf ProjectSymbols
     */
    getRootContext() {
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
    getLazyLoadedContexts() {
        if (!this.rootContext) {
            this.getRootContext();
        }
        const summary = this.rootContext.getContextSummary();
        // If struggles with performance make it more imperative
        const discoverModules = (summary) => {
            if (!summary || !summary.type || !summary.type.reference)
                return [];
            const routes = summary.providers
                .filter(p => 'ANALYZE_FOR_ENTRY_COMPONENTS' === p.provider.token.identifier.reference.name)
                .map(p => p.provider.useValue);
            const contexts = [].concat.apply([], routes)
                .filter(r => !!r.loadChildren)
                .map(r => this.lazyModuleResolver.resolve(summary.type.reference.filePath, r))
                .filter(r => !!r)
                .map(p => new ContextSymbols(this.programFactory.create([p]), this.resolver));
            return contexts.concat([].concat.apply([], contexts.map(c => c.getContextSummary()).map(discoverModules)));
        };
        return [this.rootContext].concat(discoverModules(summary));
    }
}
//# sourceMappingURL=project-symbols.js.map