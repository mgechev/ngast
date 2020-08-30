import { Symbol } from './symbol';
import { ComponentAnalysisData } from '@angular/compiler-cli/src/ngtsc/annotations/src/component';
import { assertDeps } from './utils';
import { CssAst } from '../css-parser/css-ast';
import { parseCss } from '../css-parser/parse-css';
import { InjectableSymbol } from './injectable.symbol';

export class ComponentSymbol extends Symbol<ComponentAnalysisData> {
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
    const symbols: InjectableSymbol[] = [];
    // The analysis only provides the list of providers requiring factories
    const providers = this.analysis.providersRequiringFactory;
    if (providers) {
      for (const provider of providers) {
        const symbol = new InjectableSymbol(this.workspace, provider.node);
        symbols.push(symbol);
      }
    }
    return symbols;
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
