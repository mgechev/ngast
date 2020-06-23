import { Symbol } from './symbol';
import { PipeHandlerData } from '@angular/compiler-cli/src/ngtsc/annotations/src/pipe';

export class PipeSymbol extends Symbol<PipeHandlerData> {
  protected readonly annotation = 'Pipe';

  get deps() {
    return this.metadata.deps;
  }

  get metadata() {
    return this.analysis.meta;
  }
}
