import { Symbol } from './symbol';
import { assertDeps, exists } from './utils';
import { CssAst } from '../css-parser/css-ast';
import { parseCss } from '../css-parser/parse-css';
import { WrappedNodeExpr } from '@angular/compiler';
import { ComponentMetadata } from './metadata';
import { TransformTemplateVisitor, TemplateNode } from './template-transform.visitor';

export class ComponentSymbol extends Symbol<'Component'> {
  readonly annotation = 'Component';

  private assertScope() {
    const scope = this.getScope();
    if (scope === null) {
      throw new Error(`Could not find scope for component ${this.name}. Check [ComponentSymbol].diagnostics`);
    } else {
      return scope;
    }
  }

  /** @internal */
  get deps() {
    return this.analysis?.meta.deps;
  }

  get metadata(): ComponentMetadata | null {
    const meta = this.analysis?.meta;
    if (!meta) {
      return null;
    }
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
    const providers = this.analysis?.meta.providers;
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
  getStylesAst(): CssAst[] | null | undefined {
    return this.analysis?.meta.styles.map(s => parseCss(s));
  }

  /** The Template AST provided by Ivy */
  getTemplateAst(): undefined | null | TemplateNode[] {
    const scope = this.getScope();
    if (scope === null) {
      return null;
    }
    const visitor = new TransformTemplateVisitor(scope, this.workspace);
    return this.analysis?.meta.template.nodes.map(node => node.visit(visitor));
  }
}
