import { Symbol } from './symbol';
import { ComponentAnalysisData } from '@angular/compiler-cli/src/ngtsc/annotations/src/component';
import { assertDeps } from './utils';
import { findSymbol } from '.';
import { CssAst } from '../css-parser/css-ast';
import { parseCss } from '../css-parser/parse-css';

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

  getDependancies() {
    assertDeps(this.deps, this.name);
    return this.deps.map(dep => findSymbol(this.workspace, dep.token));
  }

  getStyleAsts(): CssAst[] | null {
    return this.metadata.styles.map(s => parseCss(s));
  }

  getTemplateAsts() {
    return this.metadata.template.nodes;
  }
}
