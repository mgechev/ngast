import { NgModuleAnalysis } from '@angular/compiler-cli/src/ngtsc/annotations/src/ng_module';
import { Symbol } from './symbol';
import { isArrayLiteralExpression, isIdentifier } from 'typescript';
import { InjectableSymbol } from './injectable.symbol';
import { getSymbolOf, findSymbol } from '.';

export class ModuleSymbol extends Symbol<NgModuleAnalysis> {
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

  getProviders() {
    const providers: InjectableSymbol[] = [];
    // Injectable Classes
    if (isArrayLiteralExpression(this.analysis.providers)) {
      this.analysis.providers.elements.forEach(element => {
        if (isIdentifier(element)) {
          const node = this.workspace.reflector.getDeclarationOfIdentifier(element).node;
          if (!!node && this.workspace.reflector.isClass(node)) {
            providers.push(new InjectableSymbol(this.workspace, node));
          }
        }
      });
    }
    // Factories as classes
    this.analysis.providersRequiringFactory.forEach(ref => {
      const factory = new InjectableSymbol(this.workspace, ref.node);
      providers.push(factory);
    });
    return providers;
  }

  getDeclarations() {
    // use ref.value as "type" is the expression used by ngcc in .d.ts files
    return this.metadata.declarations.map(ref => findSymbol(this.workspace, ref.value));
  }

  getImports() {
    return this.metadata.imports.map(ref => findSymbol(this.workspace, ref.value) as ModuleSymbol);
  }
}
