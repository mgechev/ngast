import {Program} from 'typescript';
import {resolveForwardRef} from '@angular/core';
import {StaticSymbol, PipeResolver} from '@angular/compiler';

import {ProjectSymbols} from './project-symbols';
import {Symbol} from './symbol';

export class PipeSymbol extends Symbol {
  constructor(
    program: Program,
    symbol: StaticSymbol,
    private resolver: PipeResolver,
    private projectSymbols: ProjectSymbols
  ) {
    super(program, symbol);
  }

  getModule() {
    return this.projectSymbols.getAnalyzedModules()
      .ngModuleByPipeOrDirective.get(this.symbol);
  }

  getMetadata() {
    return this.resolver.resolve(resolveForwardRef(this.symbol));
  }
}
