import { Symbol } from './symbol';
import { assertDeps, exists } from './utils';

export class PipeSymbol extends Symbol<'Pipe'> {
  readonly annotation = 'Pipe';

  /** @internal */
  get deps() {
    return this.metadata?.deps;
  }

  get metadata() {
    return this.analysis?.meta;
  }

  /** Return dependencies injected in the constructor of the pipe */
  getDependencies() {
    assertDeps(this.deps, this.name);
    return this.deps.map(dep => this.workspace.findSymbol(dep.token)).filter(exists);
  }
}
