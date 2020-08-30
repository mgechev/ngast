import { Symbol } from './symbol';
import { PipeHandlerData } from '@angular/compiler-cli/src/ngtsc/annotations/src/pipe';
import { assertDeps } from './utils';

export class PipeSymbol extends Symbol<PipeHandlerData> {
  protected readonly annotation = 'Pipe';

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
