import type { WorkspaceSymbols } from './workspace.symbols';
import { InjectableSymbol } from './injectable.symbol';
import { Reference } from '@angular/compiler-cli/src/ngtsc/imports';
import { DynamicValue, ResolvedValue } from '@angular/compiler-cli/src/ngtsc/partial_evaluator';
import { isClassDeclaration, isIdentifier, Node } from 'typescript';
import { Expression } from 'typescript';

const useKeys = [ 'useValue', 'useFactory', 'useExisting' ] as const;
type UseKey = typeof useKeys[number];

interface ProviderMetadata {
  provide: Reference | DynamicValue;
  useKey: UseKey;
  value: any;
}

export function getProviderMetadata(provider: Map<any, any>): ProviderMetadata {
  const provide = provider.get('provide');
  if (!provide) {
    return null;
  }
  const useKey = useKeys.find(key => provider.has(key));
  if (!useKey) {
    return null;
  }
  const value = provider.get(useKey);
  return { provide, useKey, value };
}

export class Provider {
  constructor(
    protected workspace: WorkspaceSymbols,
    public metadata: ProviderMetadata
  ) {}

  get name() {
    if (this.metadata.provide instanceof Reference) {
      if (isClassDeclaration(this.metadata.provide.node)) {
        return this.metadata.provide.node.name?.text;
      }
    }
    if (this.metadata.provide instanceof DynamicValue) {
      if (isIdentifier(this.metadata.provide.node)) {
        return this.metadata.provide.node.text;
      }
    }
  }
}

// TODO : Create a provider registry to keep track of Providers
export class ProviderRegistry {
  /**
   * A map of provider { [scope: Node]: { [Indentifier: Node]: Provider }}
   */
  providers: Map<Node, Map<Node, Provider>>;
  constructor(private workspace: WorkspaceSymbols) {}

  /** Record all providers in every NgModule, Component & Directive */
  recordAll() {
    // TODO
  }

  /** Find all providers of a provider expression */
  getProviders(expression: Expression) {
    const providers: (InjectableSymbol | Provider)[] = [];
      const resolvedProviders = this.workspace.evaluator.evaluate(expression);
  
      const addProvider = (value: ResolvedValue) => {
        if (value instanceof Reference) {
          if (this.workspace.reflector.isClass(value.node)) {
            const inj = new InjectableSymbol(this.workspace, value.node);
            providers.push(inj);
          }
        }
      };
  
      const recursivelyAddProviders = (meta: ResolvedValue)=> {
        if (Array.isArray(meta)) {
          for (const entry of meta) {
            recursivelyAddProviders(entry);
          }
        } else if (meta instanceof Map) {
          // useClass is considered as an injectable by the compiler
          if (meta.has('useClass') && meta.has('provide')) {
            addProvider(meta.get('useClass'));
          } else {
            const metadata = getProviderMetadata(meta);
            if (metadata) {
              const provider = new Provider(this.workspace, metadata);
              providers.push(provider);
            }
          }
        } else {
          addProvider(meta);
        }
      };
      recursivelyAddProviders(resolvedProviders);
    return providers;
  }
}