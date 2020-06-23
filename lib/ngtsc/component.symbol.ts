import { Symbol } from './symbol';
import { ComponentAnalysisData } from '@angular/compiler-cli/src/ngtsc/annotations/src/component';
import { assertDeps } from './utils';
import { findSymbol } from '.';

export class ComponentSymbol extends Symbol<ComponentAnalysisData> {
  protected readonly annotation = 'Component';

  get deps() {
    return this.metadata.deps;
  }

  get metadata() {
    return this.analysis.meta;
  }

  get scope() {
    this.ensureAnalysis();
    return this.workspace.scopeRegistry.getScopeForComponent(this.node);
  }

  getGuards() {
    throw new Error('Not implemented yet');
  }

  getDependancies() {
    assertDeps(this.deps, this.name);
    return this.deps.map(dep => findSymbol(this.workspace, dep.token));
  }
}
