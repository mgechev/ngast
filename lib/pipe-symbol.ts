import {Program} from 'typescript';
import {resolveForwardRef, Pipe} from '@angular/core';
import {StaticSymbol, PipeResolver, CompileNgModuleMetadata} from '@angular/compiler';

import {ContextSymbols} from './context-symbols';
import {Symbol} from './symbol';

export class PipeSymbol extends Symbol {
  constructor(
    program: Program,
    symbol: StaticSymbol,
    private resolver: PipeResolver,
    private projectSymbols: ContextSymbols
  ) {
    super(program, symbol);
  }

  getModule(): CompileNgModuleMetadata | undefined {
    return this.projectSymbols.getAnalyzedModules()
      .ngModuleByPipeOrDirective.get(this.symbol);
  }

  getMetadata(): Pipe {
    return this.resolver.resolve(resolveForwardRef(this.symbol));
  }
}
