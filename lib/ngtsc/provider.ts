import type { WorkspaceSymbols } from './workspace.symbols';
import { InjectableSymbol } from './injectable.symbol';
import { Reference } from '@angular/compiler-cli/src/ngtsc/imports';
import { DynamicValue } from '@angular/compiler-cli/src/ngtsc/partial_evaluator';
import { isClassDeclaration, isIdentifier, Identifier } from 'typescript';
import { Expression } from 'typescript';
import { WrappedNodeExpr } from '@angular/compiler';
import { isAnalysed, filterByHandler } from './symbol';
import { AnnotationNames } from './utils';
import { ClassDeclaration } from '@angular/compiler-cli/src/ngtsc/reflection';


/////////
// WIP //
/////////


const useKeys = ['useValue', 'useFactory', 'useExisting'] as const;
type UseKey = typeof useKeys[number];

interface ProviderMetadata {
  provide: Reference | DynamicValue | string;
  /** The key used by the provider  */
  useKey: UseKey;
  /** The content of the useKey */ 
  value: any;
}

export function getProviderMetadata(provider: Map<any, any>): ProviderMetadata | null {
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
  ) { }

  get name() {
    if (typeof this.metadata.provide === 'string') {
      return this.metadata.provide;
    }
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

// TODO : It doesn't looks like a good idea to map with the real value instead of the token...
export class ProviderRegistry {
  /** List of all the providers that are not injectables */
  private providers: Map<string | Identifier, Provider> = new Map();
  constructor(private workspace: WorkspaceSymbols) { }

  /** Record all providers in every NgModule, Component & Directive */
  recordAll() {
    // Helper fn to get all analysis of an annotation
    const getAllAnalysis = <A extends AnnotationNames>(annotation: A) => {
      const records = this.workspace.traitCompiler.allRecords(annotation);
      return records.map(record => {
        const [analysis] = record.traits.filter(filterByHandler<A>(annotation))
          .filter(isAnalysed)
          .map(trait => trait.analysis);
        return analysis;
      });
    }
    for (const analysis of getAllAnalysis('NgModule')) {
      if (analysis) {
        this.recordProviders(analysis.providers);
      }
    }
    for (const analysis of getAllAnalysis('Component')) {
      const providers = analysis?.meta.providers;
      if (providers instanceof WrappedNodeExpr) {
        this.recordProviders(providers.node);
      }
    }
    for (const analysis of getAllAnalysis('Directive')) {
      const providers = analysis?.meta.providers;
      if (providers instanceof WrappedNodeExpr) {
        this.recordProviders(providers.node);
      }
    }
  }

  /** Find all providers of a provider expression */
  recordProviders(expression: Expression | null) {
    if (expression) {
      const resolveValue = this.workspace.evaluator.evaluate(expression);
      const visit = (value: any) => {
        if (Array.isArray(value)) {
          value.forEach(visit);
        } else if (value instanceof Map) {
          const metadata = getProviderMetadata(value);
          const key = getKeyFromProvide(metadata?.provide);
          if (metadata && key) {
            const provider = new Provider(this.workspace, metadata);
            this.providers.set(key, provider);
          }
        }
      }
      visit(resolveValue);
    }
  }

  /** Get all providers from a list of providers in a decorator NgModule, Directive, Component */
  getAllProviders(expression: Expression | null) {
    const result: (InjectableSymbol | Provider)[] = [];
    if (expression) {
      const resolveValue = this.workspace.evaluator.evaluate(expression);
      const addInjectable = (ref: Reference<ClassDeclaration>) => {
        const symbol = this.workspace.getSymbol(ref.node);
        if (symbol) {
          result.push(symbol as InjectableSymbol);
        }
      }
      const addProvider = (value: ProviderMetadata['provide']) => {
        const key = getKeyFromProvide(value);
        if (key && this.providers.has(key)) {
          const provider = this.providers.get(key);
          if (provider) result.push(provider);
        }
      }
      const visit = (value: any) => {
        if (Array.isArray(value)) {
          value.forEach(visit);
        } else if (value instanceof Map) {
          if (value.has('useClass')) {
            addInjectable(value.get('useClass'))
          } else {
            addProvider(value.get('provide'));
          }
        } else {
          addInjectable(value);
        }
      }
      visit(resolveValue);
    }
    return result;
  }

  /** Return the provider for a token previously stored */
  getProvider(token: any) {
    const value = this.workspace.evaluator.evaluate(token) as ProviderMetadata['provide'];
    const key = getKeyFromProvide(value);
    if (key && this.providers.has(key)) {
      return this.providers.get(key);
    }
  }
}

// TODO: check to use declaration instead of Identifier ...
function getKeyFromProvide(provide?: ProviderMetadata['provide']): string | Identifier | undefined {
  if (provide) {
    if (provide instanceof DynamicValue && isIdentifier(provide.node)) {
      return provide.node;
    } else if (typeof provide === 'string') {
      return provide;
    }
  }
}