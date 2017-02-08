import {Program} from 'typescript';

import {UrlResolver} from '@angular/compiler';
import {ContextSymbols} from './context-symbols';
import {ResourceResolver} from './resource-resolver';

export interface Route {
  path: string;
  loadChildren?: string;
  component?: any;
}

export interface LazyModuleResolver {
  resolve(base: string, routeDefinition: Route): string | undefined;
}

export class BasicLazyModuleResolver implements LazyModuleResolver {
  private resolver = new UrlResolver();

  resolve(base: string, route: Route) {
    if (typeof route.loadChildren === 'string') {
      return this.resolver.resolve(base, (route.loadChildren.split('#').shift() || '') + '.ts');
    }
    return undefined;
  }
}

export interface ProgramFactory {
  create(files?: string[]): Program;
}

export class ProjectSymbols {
  private rootContext: ContextSymbols;

  constructor(
    private programFactory: ProgramFactory,
    private resolver: ResourceResolver,
    private lazyModuleResolver = new BasicLazyModuleResolver()) {}

  getRootContext() {
    const program = this.programFactory.create();
    this.rootContext = new ContextSymbols(program, this.resolver);
    return this.rootContext;
  }

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
    return [this.getRootContext()].concat(discoverModules(summary));
  }
}
