import * as ts from 'typescript';
import {StaticSymbol} from '@angular/compiler';

export class Symbol {
  constructor(protected program: ts.Program, protected symbol: StaticSymbol) {}

  getNode(): ts.ClassDeclaration | undefined {
    const program = this.program.getSourceFile(this.symbol.filePath);
    const findNode = (node: ts.Node) => {
      if (node.kind === ts.SyntaxKind.ClassDeclaration &&
         ((node as ts.ClassDeclaration).name || { text: undefined }).text === this.symbol.name) {
        return node;
      } else {
        return ts.forEachChild(node, findNode);
      }
    };
    return findNode(program);
  }
}
