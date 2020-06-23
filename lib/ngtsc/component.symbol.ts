import { Symbol } from './symbol';
import { ComponentAnalysisData } from '@angular/compiler-cli/src/ngtsc/annotations/src/component';

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

}
