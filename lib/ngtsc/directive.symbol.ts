import { Symbol } from './symbol';
import { assertDeps, exists } from './utils';
import { WrappedNodeExpr } from '@angular/compiler';

export class DirectiveSymbol extends Symbol<'Directive'> {
  protected readonly annotation = 'Directive';

  get deps() {
    return this.metadata.deps;
  }

  get metadata() {
    return this.analysis.meta;
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
