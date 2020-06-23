import { InjectableHandlerData } from '@angular/compiler-cli/src/ngtsc/annotations/src/injectable';
import { Symbol } from './symbol';


export class InjectableSymbol extends Symbol<InjectableHandlerData> {
  protected readonly annotation = 'Injectable';

  get deps() {
    return this.analysis.ctorDeps;
  }

  get metadata() {
    return this.analysis.meta;
  }
}
