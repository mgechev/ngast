import { Symbol } from './symbol';
import { assertDeps, exists } from './utils';
import { CssAst } from '../css-parser/css-ast';
import { parseCss } from '../css-parser/parse-css';
import { WrappedNodeExpr } from '@angular/compiler';
import { ComponentMetadata } from './metadata';

export class ComponentSymbol extends Symbol<'Component'> {
  readonly annotation = 'Component';

  private assertScope() {
    const scope = this.getScope();
    if (scope === 'error') {
      throw new Error(`Could not find scope for component ${this.name}. Check [ComponentSymbol].diagnostics`);
    } else {
      return scope;
    }
  }

  /** @internal */
  get deps() {
    return this.analysis.meta.deps;
  }

  get metadata(): ComponentMetadata {
    const meta = this.analysis.meta;
    return {
      exportAs: meta.exportAs,
      changeDetection: meta.changeDetection,
      selector: meta.selector,
      inputs: meta.inputs,
      outputs: meta.outputs
    }
  }

  /** Get the module scope of the component */
  private getScope() {
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
        .map(selector => selector.split(',').map(s => s.trim()))
        .flat();
    }
  }

  /** Return the list of pipe available for the template */
  getPipeScope(): string[] {
    const scope = this.assertScope();
    return scope?.compilation.pipes.map(p => p.name) ?? []
  }

  /**
   * Return class & factory providers specific to this class
   * @note only providers specified in the `provider` fields of the component will be returned (not the module).
   */
  getProviders() {
    const providers = this.analysis.meta.providers;
    if (providers instanceof WrappedNodeExpr) {
      return this.workspace.providerRegistry.getAllProviders(providers.node);
    } else {
      return [];
    }
  }

  /** Return dependencies injected in the constructor of the component */
  getDependencies() {
    assertDeps(this.deps, this.name);
    return this.deps.map(dep => this.workspace.findSymbol(dep.token, this.path)).filter(exists);
  }

  /** The Style AST provided by ngast */
  getStylesAst(): CssAst[] | null {
    return this.analysis.meta.styles.map(s => parseCss(s));
  }

  /** The Template AST provided by Ivy */
  getTemplateAst() {
    return this.analysis.meta.template.nodes;
  }
}
