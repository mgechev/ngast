import { NgModuleAnalysis } from '@angular/compiler-cli/src/ngtsc/annotations/src/ng_module';
import { Symbol } from './symbol';
import { InjectableSymbol } from './injectable.symbol';
import { DeclarationSymbol, findSymbol } from '.';
import { ComponentSymbol } from './component.symbol';
import { assertDeps } from './utils';
import { Reference } from '@angular/compiler-cli/src/ngtsc/imports';
import { ResolvedValue } from '@angular/compiler-cli/src/ngtsc/partial_evaluator';

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
    return this.deps.map(dep => findSymbol(this.workspace, dep.token));
  }

  /**
   * Get the providers of the module.
   * WARNING: It doesn't maintain the order
   */
  getProviders() {
    const providers: InjectableSymbol[] = [];
    const resolvedProviders = this.workspace.evaluator.evaluate(this.analysis.providers);

    const addProvider = (value: ResolvedValue) => {
      if (value instanceof Reference) {
        if (this.workspace.reflector.isClass(value.node)) {
          const inj = new InjectableSymbol(this.workspace, value.node);
          providers.push(inj);
        }
      }
    };

    const recursivelyAddProviders = (provider: ResolvedValue)=> {
      if (Array.isArray(provider)) {
        for (const entry of provider) {
          recursivelyAddProviders(entry);
        }
      } else if (provider instanceof Map) {
        const provide = provider.get('provide');
        if (!provider) {
          throw new Error(`Provider object in module "${this.name}" should have key "provider"`);
        }
        if (provider.has('useClass')) {
          const useClass = provider.get('useClass');
          addProvider(useClass);
        } else if (provider.has('useValue')) {
          const useValue = provider.get('useValue');
          // todo : not implemented yet
        } else if (provider.has('useFactory')) {
          // todo : not implemented yet
        }
      } else {
        addProvider(provider);
      }
    };
    recursivelyAddProviders(resolvedProviders);
    return providers;
  }

  getDeclarations() {
    return this.metadata.declarations.map(ref => findSymbol(this.workspace, ref.value) as DeclarationSymbol);
  }

  getImports() {
    return this.metadata.imports.map(ref => findSymbol(this.workspace, ref.value) as NgModuleSymbol);
  }

  getExports() {
    return this.metadata.exports.map(ref => findSymbol(this.workspace, ref.value));
  }

  getBootstap() {
    return this.metadata.bootstrap.map(ref => findSymbol(this.workspace, ref.value) as ComponentSymbol);
  }

  getLazyRoutes() {
    // Absolute path, replace ".ts" "#ModuleName"
    const entryKey = this.node.getSourceFile().fileName.replace('.ts', `#${this.name}`);
    return this.workspace.routeAnalyzer.listLazyRoutes(entryKey);
  }
}
