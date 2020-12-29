import { Symbol } from './symbol';
import { assertDeps, exists } from './utils';
import { WrappedNodeExpr } from '@angular/compiler';
import { DirectiveMetadata } from './metadata';

export class DirectiveSymbol extends Symbol<'Directive'> {
  readonly annotation = 'Directive';

  protected get deps() {
    return this.analysis.meta.deps;
  }

  get metadata(): DirectiveMetadata {
    const meta = this.analysis.meta;
    return {
      exportAs: meta.exportAs,
      selector: meta.selector,
      inputs: meta.inputs,
      outputs: meta.outputs
    };
  }

  /**
   * Return class & factory providers specific to this class
   * @note only providers specified in the `provider` fields of the directive will be returned (not the module).
   */
  getProviders() {
    const providers = this.analysis.meta.providers;
    if (providers instanceof WrappedNodeExpr) {
      return this.workspace.providerRegistry.getAllProviders(providers.node);
    } else {
      return [];
    }
  }

  /** Return dependencies injected in the constructor of the directive */
  getDependencies() {
    assertDeps(this.deps, this.name);
    return this.deps.map(dep => this.workspace.findSymbol(dep.token)).filter(exists);
  }
}
