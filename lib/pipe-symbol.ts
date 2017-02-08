import {Program} from 'typescript';
import {resolveForwardRef, Pipe} from '@angular/core';
import {StaticSymbol, PipeResolver, CompileNgModuleMetadata} from '@angular/compiler';

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

  getModule(): CompileNgModuleMetadata | undefined {
    return this.projectSymbols.getAnalyzedModules()
      .ngModuleByPipeOrDirective.get(this.symbol);
  }

  getMetadata(): Pipe {
    return this.resolver.resolve(resolveForwardRef(this.symbol));
  }
}
