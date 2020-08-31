import { Symbol } from './symbol';
import { assertDeps, exists } from './utils';
import { CssAst } from '../css-parser/css-ast';
import { parseCss } from '../css-parser/parse-css';
import { WrappedNodeExpr } from '@angular/compiler';

export class ComponentSymbol extends Symbol<'Component'> {
  protected readonly annotation = 'Component';

  private assertScope() {
    const scope = this.getScope();
    if (scope === 'error') {
      throw new Error(`Could not find scope for component ${this.name}. Check [ComponentSymbol].diagnostics`);
    } else {
      return scope;
    }
  }

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

  /** Return the list of available selectors for the template */
  getSelectorScope(): string[] {
    const scope = this.assertScope();
    if (!scope) {
      return []
    } else {
      return scope.compilation.directives.map(d => d.selector)
        .filter(exists)
        .map(selector => selector.split(','))
        .flat();
    }
  }

  /** Return the list of pipe available for the template */
  getPipeScope(): string[] {
    const scope = this.assertScope();
    return scope?.compilation.pipes.map(p => p.name) ?? []
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
    return this.deps.map(dep => this.workspace.findSymbol(dep.token)).filter(exists);
  }

  getStylesAst(): CssAst[] | null {
    return this.metadata.styles.map(s => parseCss(s));
  }

  getTemplateAst() {
    return this.metadata.template.nodes;
  }
}
