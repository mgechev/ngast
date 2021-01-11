import { Symbol } from './symbol';
import { assertDeps, exists } from './utils';


export class InjectableSymbol extends Symbol<'Injectable'> {
  readonly annotation = 'Injectable';

  protected get deps() {
    return this.metadata?.userDeps
      ? this.metadata.userDeps
      : this.analysis.ctorDeps;
  }

  protected get metadata() {
    return this.analysis.meta;
  }

  /** Return dependencies injected in the constructor of the injectable */
  getDependencies() {
    assertDeps(this.deps, this.name);
    return this.deps.map(dep => this.workspace.findSymbol(dep.token, this.path)).filter(exists);
  }
}
