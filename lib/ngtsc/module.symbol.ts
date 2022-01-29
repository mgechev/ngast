import { Symbol } from './symbol';
import type { DeclarationSymbol } from './find-symbol';
import type { ComponentSymbol } from './component.symbol';
import { assertDeps, exists } from './utils';

export class NgModuleSymbol extends Symbol<'NgModule'> {
  readonly annotation = 'NgModule';

  /** @internal */
  get deps() {
    return  null; // this.analysis?.inj;
  }

  get metadata() {
    return this.analysis?.mod;
  }

  get scope() {
    this.ensureAnalysis();
    return this.workspace.scopeRegistry.getScopeOfModule(this.node);
  }

  /** Return dependencies injected in the constructor of the module */
  getDependencies() {
    assertDeps(this.deps, this.name);
    throw new Error('Not implemented');
    // return this.deps.map(dep => this.workspace.findSymbol(dep.token)).filter(exists);
  }

  /** Get the providers of the module as InjectableSymbol */
  getProviders() {
    return this.workspace.providerRegistry.getAllProviders(this.analysis?.providers);
  }

  /**
   * Get all declaration class of the module as `ComponentSymbol | PipeSymbol | DirectiveSymbol`
   * You can filter them using `declaration.isSymbol(name)` method:
   * @example
   * ```typescript
   * const declarations = module.getDeclarations()
   * const components = declarations.filter(declaration => declaration.isSymbol('Component'))
   * ```
   */
  getDeclarations() {
    return this.analysis?.declarations.map(ref => this.workspace.getSymbol(ref.node) as DeclarationSymbol);
  }

  /**
   * Get all modules imported by the current module.
   * You can filter them using `imported.isDts()`
   * @example
   * ```typescript
   * const imported = module.getImports();
   * const externalImports = imported.filter(import => import.isDts());
   * ```
   */
  getImports() {
    return this.analysis?.imports.map(ref => this.workspace.getSymbol(ref.node) as NgModuleSymbol);
  }

  /**
   * Get all declaration class of the module as `ComponentSymbol | PipeSymbol | DirectiveSymbol`
   * You can filter them using `exported.isSymbol(name)` method:
   * @example
   * ```typescript
   * const exported = module.getExports()
   * const components = exported.filter(export => export.isSymbol('Component'))
   * ```
   */
  getExports() {
    return this.analysis?.exports.map(ref => this.workspace.getSymbol(ref.node));
  }

  /** Get the list of components bootstraped by the module if any */
  getBootstap() {
    return this.metadata?.bootstrap.map(ref => this.workspace.findSymbol(ref.value) as ComponentSymbol);
  }
}
