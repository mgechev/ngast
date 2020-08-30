import { NgModuleAnalysis } from '@angular/compiler-cli/src/ngtsc/annotations/src/ng_module';
import { Symbol } from './symbol';
import { InjectableSymbol } from './injectable.symbol';
import type { DeclarationSymbol } from './find-symbol';
import type { ComponentSymbol } from './component.symbol';
import { assertDeps } from './utils';

export class NgModuleSymbol extends Symbol<NgModuleAnalysis> {
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

  getDependancies() {
    assertDeps(this.deps, this.name);
    return this.deps.map(dep => this.workspace.findSymbol(dep.token));
  }

  /**
   * Get the providers of the module as InjectableSymbol
   */
  getProviders() {
    const symbols: InjectableSymbol[] = [];
    // The analysis only provides the list of providers requiring factories
    const providers = this.analysis.providersRequiringFactory;
    if (providers) {
      for (const provider of providers) {
        const symbol = new InjectableSymbol(this.workspace, provider.node);
        symbols.push(symbol);
      }
    }
    return symbols;
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

  getLazyRoutes() {
    // Absolute path, replace ".ts" "#ModuleName"
    const entryKey = this.node.getSourceFile().fileName.replace('.ts', `#${this.name}`);
    return this.workspace.routeAnalyzer.listLazyRoutes(entryKey);
  }
}
