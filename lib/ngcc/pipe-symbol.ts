import { Program } from 'typescript';
import { resolveForwardRef, Pipe } from '@angular/core';
import {
  StaticSymbol,
  PipeResolver,
  CompileNgModuleMetadata,
  CompileMetadataResolver,
  ProviderMeta
} from '@angular/compiler';

import { ProjectSymbols } from './project-symbols';
import { Symbol } from './symbol';
import { ProviderSymbol } from './provider-symbol';

/**
 * A wrapper around the pipe symbol.
 *
 * @export
 * @class PipeSymbol
 * @extends {Symbol}
 */
export class PipeSymbol extends Symbol {
  /**
   * Creates an instance of PipeSymbol.
   *
   * @param {Program} program
   * @param {StaticSymbol} symbol
   * @param {PipeResolver} resolver
   * @param {ContextSymbols} projectSymbols
   *
   * @memberOf PipeSymbol
   */
  constructor(
    program: Program,
    symbol: StaticSymbol,
    private resolver: PipeResolver,
    private metadataResolver: CompileMetadataResolver,
    private projectSymbols: ProjectSymbols
  ) {
    super(program, symbol);
  }

  /**
   * Returns the module where the wrapped pipe was defined.
   *
   * @returns {(CompileNgModuleMetadata | undefined)}
   *
   * @memberOf PipeSymbol
   */
  getModule(): CompileNgModuleMetadata | undefined {
    return this.projectSymbols.getAnalyzedModules().ngModuleByPipeOrDirective.get(this.symbol);
  }

  /**
   * Returns the pipe metadata.
   *
   * @returns {Pipe}
   *
   * @memberOf PipeSymbol
   */
  getMetadata(): Pipe | null {
    return this.resolver.resolve(resolveForwardRef<any>(this.symbol));
  }

  getDependencies() {
    const summary = this.metadataResolver.getInjectableSummary(this.symbol);
    if (!summary) {
      return [];
    } else {
      return (summary.type.diDeps || []).map(d => {
        let token = d.token;
        if (d.token) {
          if (d.token.identifier) {
            token = d.token.identifier.reference;
          }
        }
        const meta = new ProviderMeta(token, { useClass: d.value });
        return new ProviderSymbol(
          this._program,
          this.metadataResolver.getProviderMetadata(meta),
          this.metadataResolver
        );
      });
    }
  }
}
