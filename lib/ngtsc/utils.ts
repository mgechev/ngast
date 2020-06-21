import {
  InjectableDecoratorHandler,
  PipeDecoratorHandler,
  DirectiveDecoratorHandler,
  NgModuleDecoratorHandler,
  ComponentDecoratorHandler,
} from '@angular/compiler-cli/src/ngtsc/annotations';
import { DecoratorHandler, Trait } from '@angular/compiler-cli/src/ngtsc/transform';
import { Decorator, ClassDeclaration as ngClassDeclaration } from '@angular/compiler-cli/src/ngtsc/reflection';
import { InjectableHandlerData } from '@angular/compiler-cli/src/ngtsc/annotations/src/injectable';
import { PipeHandlerData } from '@angular/compiler-cli/src/ngtsc/annotations/src/pipe';
import { DirectiveHandlerData } from '@angular/compiler-cli/src/ngtsc/annotations/src/directive';
import { NgModuleAnalysis } from '@angular/compiler-cli/src/ngtsc/annotations/src/ng_module';
import { ComponentAnalysisData } from '@angular/compiler-cli/src/ngtsc/annotations/src/component';
import { isCallExpression, ClassDeclaration as tsClassDeclaration } from 'typescript';

// ----- Node Type Guard ----- //
type ClassDeclaration = ngClassDeclaration | tsClassDeclaration;
export type AnnotationNames = 'NgModule' | 'Pipe' | 'Injectable' | 'Directive' | 'Component';
export function hasDecoratorName(node: ClassDeclaration, name: AnnotationNames) {
  return node.decorators?.some(decorator => {
    const expression = decorator.expression;
    return isCallExpression(expression) && expression.expression.getText() === name;
  });
}

// ----- Handler Type Guard ----- //
export function isInjectableDecoratorHandler(
  handler: DecoratorHandler<unknown, unknown, unknown>
): handler is InjectableDecoratorHandler {
  return handler.name === 'InjectableDecoratorHandler';
}

export function isPipeDecoratorHandler(
  handler: DecoratorHandler<unknown, unknown, unknown>
): handler is PipeDecoratorHandler {
  return handler.name === 'PipeDecoratorHandler';
}

export function isDirectiveDecoratorHandler(
  handler: DecoratorHandler<unknown, unknown, unknown>
): handler is DirectiveDecoratorHandler {
  return handler.name === 'DirectiveDecoratorHandler';
}

export function isNgModuleDecoratorHandler(
  handler: DecoratorHandler<unknown, unknown, unknown>
): handler is NgModuleDecoratorHandler {
  return handler.name === 'NgModuleDecoratorHandler';
}

export function isComponentDecoratorHandler(
  handler: DecoratorHandler<unknown, unknown, unknown>
): handler is ComponentDecoratorHandler {
  return handler.name === 'ComponentDecoratorHandler';
}


// ----- Trait Type Guard ----- //
export function isInjectableTrait(trait: Trait<any, any, any>): trait is Trait<Decorator, InjectableHandlerData, unknown> {
  return isInjectableDecoratorHandler(trait.handler);
}

export function isPipeTrait(trait: Trait<any, any, any>): trait is Trait<Decorator, PipeHandlerData, unknown> {
  return isPipeDecoratorHandler(trait.handler);
}

export function isDirectiveTrait(trait: Trait<any, any, any>): trait is Trait<Decorator, DirectiveHandlerData, unknown> {
  return isPipeDecoratorHandler(trait.handler);
}

export function isNgModuleTrait(trait: Trait<any, any, any>): trait is Trait<Decorator, NgModuleAnalysis, unknown> {
  return isNgModuleDecoratorHandler(trait.handler);
}

export function isComponentTrait(trait: Trait<any, any, any>): trait is Trait<Decorator, ComponentAnalysisData, unknown> {
  return isComponentDecoratorHandler(trait.handler);
}
