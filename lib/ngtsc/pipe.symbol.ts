import { Symbol } from './symbol';
import { assertDeps, exists } from './utils';

export class PipeSymbol extends Symbol<'Pipe'> {
  protected readonly annotation = 'Pipe';

  get deps() {
    return this.metadata.deps;
  }

  get metadata() {
    return this.analysis.meta;
  }

  getDependencies() {
    assertDeps(this.deps, this.name);
    return this.deps.map(dep => this.workspace.findSymbol(dep.token)).filter(exists);
  }
}
