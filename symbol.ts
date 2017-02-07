import * as ts from 'typescript';
import {StaticSymbol} from '@angular/compiler';

export class Symbol {
  constructor(protected symbol: StaticSymbol) {}

  getNode(): ts.Node {
    return null;
  }
}
