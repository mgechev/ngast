import {Program} from 'typescript';
import {resolveForwardRef, Pipe} from '@angular/core';
import {StaticSymbol, PipeResolver, CompileNgModuleMetadata} from '@angular/compiler';

import {ContextSymbols} from './context-symbols';
import {Symbol} from './symbol';


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
    private projectSymbols: ContextSymbols
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
    return this.projectSymbols.getAnalyzedModules()
      .ngModuleByPipeOrDirective.get(this.symbol);
  }


  /**
   * Returns the pipe metadata.
   *
   * @returns {Pipe}
   *
   * @memberOf PipeSymbol
   */
  getMetadata(): Pipe {
    return this.resolver.resolve(resolveForwardRef(this.symbol));
  }
}
