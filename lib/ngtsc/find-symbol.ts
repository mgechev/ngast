import { ClassDeclaration } from '@angular/compiler-cli/src/ngtsc/reflection';
import { WorkspaceSymbols } from './workspace.symbols';
import { NgModuleSymbol } from './module.symbol';
import { InjectableSymbol } from './injectable.symbol';
import { DirectiveSymbol } from './directive.symbol';
import { ComponentSymbol } from './component.symbol';
import { PipeSymbol } from './pipe.symbol';
import { AnnotationNames } from './utils';

export type DeclarationSymbol = ComponentSymbol | DirectiveSymbol | PipeSymbol;

export const symbolFactory = {
  'NgModule': (workspace: WorkspaceSymbols, node: ClassDeclaration) => new NgModuleSymbol(workspace, node),
  'Injectable': (workspace: WorkspaceSymbols, node: ClassDeclaration) => new InjectableSymbol(workspace, node),
  'Directive': (workspace: WorkspaceSymbols, node: ClassDeclaration) => new DirectiveSymbol(workspace, node),
  'Component': (workspace: WorkspaceSymbols, node: ClassDeclaration) => new ComponentSymbol(workspace, node),
  'Pipe': (workspace: WorkspaceSymbols, node: ClassDeclaration) => new PipeSymbol(workspace, node),
};

export type SymbolFactory = typeof symbolFactory;
export type FactoryOutput<A extends AnnotationNames> = ReturnType<SymbolFactory[A]>;
export type FactoryOutputs = ReturnType<SymbolFactory[AnnotationNames]>;
