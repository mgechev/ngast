import { Symbol } from './symbol';
import { assertDeps } from './utils';

export class DirectiveSymbol extends Symbol<'Directive'> {
  protected readonly annotation = 'Directive';

  get deps() {
    return this.metadata.deps;
  }

  get metadata() {
    return this.analysis.meta;
  }

  getDependencies() {
    assertDeps(this.deps, this.name);
    return this.deps.map(dep => this.workspace.findSymbol(dep.token));
  }
}
