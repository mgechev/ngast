import { Symbol } from './symbol';
import { assertDeps } from './utils';
import { CssAst } from '../css-parser/css-ast';
import { parseCss } from '../css-parser/parse-css';
import { WrappedNodeExpr } from '@angular/compiler';

const exists = <T>(value: T | undefined | null): value is T => !!(value ?? false);

export class ComponentSymbol extends Symbol<'Component'> {
  protected readonly annotation = 'Component';

  get deps() {
    return this.metadata.deps;
  }

  get metadata() {
    return this.analysis.meta;
  }

  getScope() {
    this.ensureAnalysis();
    return this.workspace.scopeRegistry.getScopeForComponent(this.node);
  }

  /** Return the list of available selectors for the templace */
  getSelectorScope(): string[] {
    const scope = this.getScope();
    if (!scope) {
      return []
    } else if (scope !== 'error') {
      return scope.compilation.directives.map(d => d.selector)
        .filter(exists)
        .map(selector => selector.split(','))
        .flat();
    } else {
      throw new Error(`Could not find scope for component ${this.name}. Check [ComponentSymbol].diagnostics`);
    }
  }

  getProviders() {
    const providers = this.analysis.meta.providers;
    if (providers instanceof WrappedNodeExpr) {
      return this.workspace.providerRegistry.getAllProviders(providers.node);
    } else {
      return [];
    }
  }

  getDependencies() {
    assertDeps(this.deps, this.name);
    return this.deps.map(dep => this.workspace.findSymbol(dep.token));
  }

  getStylesAst(): CssAst[] | null {
    return this.metadata.styles.map(s => parseCss(s));
  }

  getTemplateAst() {
    return this.metadata.template.nodes;
  }
}
