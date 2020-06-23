import { Symbol } from './symbol';
import { DirectiveHandlerData } from '@angular/compiler-cli/src/ngtsc/annotations/src/directive';

export class DirectiveSymbol extends Symbol<DirectiveHandlerData> {
  protected readonly annotation = 'Directive';

  get deps() {
    return this.metadata.deps;
  }

  get metadata() {
    return this.analysis.meta;
  }

}
