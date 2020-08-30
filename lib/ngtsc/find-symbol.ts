import { isIdentifier } from 'typescript';
import { Expression, WrappedNodeExpr } from '@angular/compiler';
import { ClassDeclaration } from '@angular/compiler-cli/src/ngtsc/reflection';
import { isFromDtsFile } from '@angular/compiler-cli/src/ngtsc/util/src/typescript';
import { getLocalAnnotation, getDtsAnnotation } from './utils';
import { WorkspaceSymbols } from './workspace.symbols';
import { NgModuleSymbol } from './module.symbol';
import { InjectableSymbol } from './injectable.symbol';
import { DirectiveSymbol } from './directive.symbol';
import { ComponentSymbol } from './component.symbol';
import { PipeSymbol } from './pipe.symbol';
import { AnnotationNames } from './utils';

export type DeclarationSymbol = ComponentSymbol | DirectiveSymbol | PipeSymbol;

const symbolFactory = {
  'NgModule': (workspace: WorkspaceSymbols, node: ClassDeclaration) => new NgModuleSymbol(workspace, node),
  'Injectable': (workspace: WorkspaceSymbols, node: ClassDeclaration) => new InjectableSymbol(workspace, node),
  'Directive': (workspace: WorkspaceSymbols, node: ClassDeclaration) => new DirectiveSymbol(workspace, node),
  'Component': (workspace: WorkspaceSymbols, node: ClassDeclaration) => new ComponentSymbol(workspace, node),
  'Pipe': (workspace: WorkspaceSymbols, node: ClassDeclaration) => new PipeSymbol(workspace, node),
};

export type SymbolFactory = typeof symbolFactory;
export type FactoryOutput<A extends keyof SymbolFactory> = ReturnType<SymbolFactory[A]>;
export type FactoryOutputs = ReturnType<SymbolFactory[keyof SymbolFactory]>;


/** find the declaration & create a symbol out of it */
export function findSymbol(workspace: WorkspaceSymbols, expression: Expression) {
  if (expression instanceof WrappedNodeExpr && isIdentifier(expression.node)) {
    const decl = workspace.reflector.getDeclarationOfIdentifier(expression.node);

    if (decl?.node && workspace.reflector.isClass(decl.node)) {
      return getSymbolOf(workspace, decl.node);
    } else {
      // TODO implement a way to load @Inject dependencies
      console.log('Could not create symbol for node', decl?.node, 'only class are supported yet');
      return null;
    }
  }
}

/** Create a symbol based on the name of the decorator or the theta static value */
export function getSymbolOf(workspace: WorkspaceSymbols, node: ClassDeclaration) {
  const isDts = isFromDtsFile(node);
  let annotation: AnnotationNames | undefined;
  if (isDts) {
    const members = workspace.reflector.getMembersOfClass(node);
    annotation = getDtsAnnotation(members);
  } else {
    annotation = getLocalAnnotation(node.decorators);
  }
  if (annotation && (annotation in symbolFactory)) {
    const factory = symbolFactory[annotation];
    return factory(workspace, node);
  }
}
