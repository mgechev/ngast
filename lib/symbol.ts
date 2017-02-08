import * as ts from 'typescript';
import {StaticSymbol} from '@angular/compiler';

export class Symbol {
  constructor(protected _program: ts.Program, protected _symbol: StaticSymbol) {}

  getNode(): ts.ClassDeclaration | undefined {
    const program = this._program.getSourceFile(this._symbol.filePath);
    const findNode = (node: ts.Node) => {
      if (node.kind === ts.SyntaxKind.ClassDeclaration &&
         ((node as ts.ClassDeclaration).name || { text: undefined }).text === this._symbol.name) {
        return node;
      } else {
        return ts.forEachChild(node, findNode);
      }
    };
    return findNode(program);
  }

  get symbol() {
    return this._symbol;
  }
}
