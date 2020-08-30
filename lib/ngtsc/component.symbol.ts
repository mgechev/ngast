import { Symbol } from './symbol';
import { assertDeps } from './utils';
import { CssAst } from '../css-parser/css-ast';
import { parseCss } from '../css-parser/parse-css';
import { WrappedNodeExpr } from '@angular/compiler';

export class ComponentSymbol extends Symbol<'Component'> {
  protected readonly annotation = 'Component';

  get deps() {
    return this.metadata.deps;
  }

  get metadata() {
    return this.analysis.meta;
  }

  get scope() {
    this.ensureAnalysis();
    return this.workspace.scopeRegistry.getScopeForComponent(this.node);
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
