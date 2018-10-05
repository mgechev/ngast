import * as ts from 'typescript';
import { StaticSymbol } from '@angular/compiler';

/**
 * Base class which provides primitive for the DirectiveSymbol and
 * PipeSymbol. It contains some functionality common between these classes.
 *
 * @export
 * @class Symbol
 */
export class Symbol {
  /**
   * Creates an instance of Symbol.
   *
   * @param {ts.Program} _program
   * @param {StaticSymbol} _symbol
   *
   * @memberOf Symbol
   */
  constructor(protected _program: ts.Program, protected _symbol: StaticSymbol) {}

  /**
   * Gets the ts.node which corresponds to the controller of the DirectiveSymbol
   * or the implementation of the pipe.
   *
   * @returns {(ts.ClassDeclaration | undefined)}
   *
   * @memberOf Symbol
   */
  getNode(): ts.ClassDeclaration | undefined {
    const program = this._program.getSourceFile(this._symbol.filePath);
    const findNode = (node: ts.Node) => {
      if (
        node.kind === ts.SyntaxKind.ClassDeclaration &&
        ((node as ts.ClassDeclaration).name || { text: undefined }).text === this._symbol.name
      ) {
        return node;
      } else {
        return ts.forEachChild(node, findNode);
      }
    };
    if (program === undefined) {
      throw new Error('Cannot find program');
    }
    return findNode(program);
  }

  /**
   * The wrapped `StaticSymbol` from `@angular/compiler`.
   *
   * @readonly
   *
   * @memberOf Symbol
   */
  get symbol() {
    return this._symbol;
  }
}
