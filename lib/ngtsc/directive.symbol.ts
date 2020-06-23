import { Symbol } from './symbol';
import { DirectiveHandlerData } from '@angular/compiler-cli/src/ngtsc/annotations/src/directive';
import { assertDeps } from './utils';
import { findSymbol } from '.';

export class DirectiveSymbol extends Symbol<DirectiveHandlerData> {
  protected readonly annotation = 'Directive';

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
