import { Symbol } from './symbol';
import type { DeclarationSymbol } from './find-symbol';
import type { ComponentSymbol } from './component.symbol';
import { assertDeps, exists } from './utils';

export class NgModuleSymbol extends Symbol<'NgModule'> {
  protected readonly annotation = 'NgModule';

  get deps() {
    return this.analysis.inj.deps;
  }

  get metadata() {
    return this.analysis.mod;
  }

  get scope() {
    this.ensureAnalysis();
    return this.workspace.scopeRegistry.getScopeOfModule(this.node);
  }

  getDependencies() {
    assertDeps(this.deps, this.name);
    return this.deps.map(dep => this.workspace.findSymbol(dep.token)).filter(exists);
  }

  /**
   * Get the providers of the module as InjectableSymbol
   */
  getProviders() {
    return this.workspace.providerRegistry.getAllProviders(this.analysis.providers);
  }

  getDeclarations() {
    return this.analysis.declarations.map(ref => this.workspace.getSymbol(ref.node) as DeclarationSymbol);
  }

  getImports() {
    return this.analysis.imports.map(ref => this.workspace.getSymbol(ref.node) as NgModuleSymbol);
  }

  getExports() {
    return this.analysis.exports.map(ref => this.workspace.getSymbol(ref.node));
  }

  getBootstap() {
    return this.metadata.bootstrap.map(ref => this.workspace.findSymbol(ref.value) as ComponentSymbol);
  }
}
