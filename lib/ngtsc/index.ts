import { isIdentifier } from 'typescript';
import { ClassDeclaration } from '@angular/compiler-cli/src/ngtsc/reflection';
import { getLocalAnnotation, getDtsAnnotation, hasLocalAnnotation } from './utils';
import { WorkspaceSymbols } from './workspace.symbols';
import { NgModuleSymbol } from './module.symbol';
import { InjectableSymbol } from './injectable.symbol';
import { DirectiveSymbol } from './directive.symbol';
import { ComponentSymbol } from './component.symbol';
import { PipeSymbol } from './pipe.symbol';
import { Expression, WrappedNodeExpr } from '@angular/compiler';
import { isFromDtsFile } from '@angular/compiler-cli/src/ngtsc/util/src/typescript';

export type DeclarationSymbol = ComponentSymbol | DirectiveSymbol | PipeSymbol;

const symbolFactory = {
  'NgModule': (workspace: WorkspaceSymbols, node: ClassDeclaration) => new NgModuleSymbol(workspace, node),
  'Injectable': (workspace: WorkspaceSymbols, node: ClassDeclaration) => new InjectableSymbol(workspace, node),
  'Directive': (workspace: WorkspaceSymbols, node: ClassDeclaration) => new DirectiveSymbol(workspace, node),
  'Component': (workspace: WorkspaceSymbols, node: ClassDeclaration) => new ComponentSymbol(workspace, node),
  'Pipe': (workspace: WorkspaceSymbols, node: ClassDeclaration) => new PipeSymbol(workspace, node),
  // 'Factory': (workspace: WorkspaceSymbols, node: ClassDeclaration) => new FactorySymbol(workspace, node),
};

export type SymbolFactory = typeof symbolFactory;
export type AnnotationNames = keyof SymbolFactory;
export type FactoryOutput<A extends keyof SymbolFactory> = ReturnType<SymbolFactory[A]>;
export type FactoryOutputs = ReturnType<SymbolFactory[keyof SymbolFactory]>;


/** find the declaration & create a symbol out of it */
export function findSymbol(workspace: WorkspaceSymbols, expression: Expression) {
  if (expression instanceof WrappedNodeExpr && isIdentifier(expression.node)) {
    const decl = workspace.reflector.getDeclarationOfIdentifier(expression.node);
    if (workspace.reflector.isClass(decl.node)) {
      return getSymbolOf(workspace, decl.node);
    }
    // TODO : check factory object
  }
}

/** Create a symbol based on the name of the decorator or the theta static value */
export function getSymbolOf(workspace: WorkspaceSymbols, node: ClassDeclaration) {
  const isDts = isFromDtsFile(node);
  let annotation: AnnotationNames;
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

/** Get the first NgModule found in the file with this path */
export function getSymbolByName(workspace: WorkspaceSymbols, path: string, name: string): FactoryOutputs | undefined {
  const sf = workspace.program?.getSourceFile(path);
  if (sf) {
    let node: ClassDeclaration | null = null;
    sf.forEachChild(child => {
      if (!node && workspace.reflector.isClass(child) && child.name?.getText() === name) {
        node = child as ClassDeclaration;
      }
    });
    if (!node) {
      throw new Error(`No decorated class with name "${name}" found for path: ${path}`);
    }
    return getSymbolOf(workspace, node);
  }
}



/** Find the first class with the specific decorator name & wrap it with the right symbol */
export function getSymbolByAnnotation<A extends keyof SymbolFactory>(
  workspace: WorkspaceSymbols,
  path: string,
  annotation: A
): FactoryOutput<A> | undefined {
  const sf = workspace.program?.getSourceFile(path);
  if (sf) {
    let node: ClassDeclaration | null = null;
    sf.forEachChild(child => {
      if (!node && workspace.reflector.isClass(child) && hasLocalAnnotation(child, annotation)) {
        node = child as ClassDeclaration;
      }
    });
    if (!node) {
      throw new Error(`No @${annotation} decorated class was found for path: ${path}`);
    }
    const factory = symbolFactory[annotation];
    return factory(workspace, node) as any;
  }
}



/** Get the first NgModule found in the file with this path */
export function getNgModuleSymbol(workspace: WorkspaceSymbols, path: string) {
  return getSymbolByAnnotation(workspace, path, 'NgModule');
}

/** Get the first Injectable found in the file with this path */
export function getInjectableSymbol(workspace: WorkspaceSymbols, path: string) {
  return getSymbolByAnnotation(workspace, path, 'Injectable');
}
