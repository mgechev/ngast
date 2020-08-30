import type { WorkspaceSymbols } from './workspace.symbols';
import { InjectableSymbol } from './injectable.symbol';
import { Reference } from '@angular/compiler-cli/src/ngtsc/imports';
import { DynamicValue, ResolvedValue } from '@angular/compiler-cli/src/ngtsc/partial_evaluator';
import { isClassDeclaration, isIdentifier, Node } from 'typescript';
import { Expression as tsExpression } from 'typescript';
import { Expression as ngExpression } from '@angular/compiler/src/output/output_ast';
import { isAnalysed, filterByHandler } from './symbol';
import { AnnotationNames } from './utils';

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
  providers: Map<Node, Map<Node, Provider>> = new Map();
  constructor(private workspace: WorkspaceSymbols) {}

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
      this.recordProviders(analysis.providers);
    }
    for (const analysis of getAllAnalysis('Component')) {
      this.recordProviders(analysis.meta.providers);
    }
    for (const analysis of getAllAnalysis('Directive')) {
      this.recordProviders(analysis.meta.providers);
    }
  }

  /** Find all providers of a provider expression */
  recordProviders(expression?: ngExpression | tsExpression) {
    if (expression) {
      const resolvedProviders = this.workspace.evaluator.evaluate(expression);
    
      const scanRecursively = (meta: ResolvedValue)=> {
        if (Array.isArray(meta)) {
          for (const entry of meta) {
            scanRecursively(entry);
          }
        } else if (meta instanceof Map) {
          const metadata = getProviderMetadata(meta);
          if (metadata) {
            this.providers.set(metadata.provide, new Provider(metadata))
          }
        }
      };
      scanRecursively(resolvedProviders);
    }
  }
}