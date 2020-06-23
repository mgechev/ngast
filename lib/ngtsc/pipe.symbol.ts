import { Symbol } from './symbol';
import { PipeHandlerData } from '@angular/compiler-cli/src/ngtsc/annotations/src/pipe';
import { assertDeps } from './utils';
import { findSymbol } from '.';

export class PipeSymbol extends Symbol<PipeHandlerData> {
  protected readonly annotation = 'Pipe';

  get deps() {
    return this.metadata.deps;
  }

  get metadata() {
    return this.analysis.meta;
  }

  getDependancies() {
    assertDeps(this.deps, this.name);
    return this.deps.map(dep => findSymbol(this.workspace, dep.token));
  }
}
