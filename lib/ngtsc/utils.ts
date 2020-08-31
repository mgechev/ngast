import { ClassDeclaration as ngClassDeclaration, ClassMember } from '@angular/compiler-cli/src/ngtsc/reflection';
import { isCallExpression, ClassDeclaration as tsClassDeclaration, Decorator, NodeArray } from 'typescript';
import { R3DependencyMetadata } from '@angular/compiler';
import { AssertionError } from 'assert';

export const annotationNames = ['NgModule', 'Pipe', 'Injectable', 'Directive', 'Component'] as const;

export const annotationTheta = {
  'ɵmod': 'NgModule',
  'ɵdir': 'Directive',
  'ɵinj': 'Injectable',
  'ɵpipe': 'Pipe',
  'ɵcmp': 'Component',
  // 'ɵfac': 'Factory'
  // 'ɵloc': 'LocalID'
};

// ----- Node Type Guard ----- //
type ClassDeclaration = ngClassDeclaration | tsClassDeclaration;
export type AnnotationNames = typeof annotationNames[number];

export function getDecoratorName(decorator: Decorator) {
  const expression = decorator.expression;
  return isCallExpression(expression) && expression.expression.getText();
}

/** Verify if class is decorated with an annotation */
export function hasLocalAnnotation(node: ClassDeclaration, name: AnnotationNames) {
  return node.decorators?.some(decorator => getDecoratorName(decorator) === name);
}

/** Vrify if the dts class has the static annotation */
export function hasDtsAnnotation(members: ClassMember[], name: AnnotationNames) {
  return members?.some(m => m.isStatic && m.name in annotationTheta);
}


/** Get the name of the annotation of the local class if any */
export function getLocalAnnotation(decorators?: NodeArray<Decorator>): AnnotationNames | undefined {
  return decorators?.map(getDecoratorName).find(name => annotationNames.includes(name as any)) as AnnotationNames;
}

/** Ge the name of the annotation of a dts class if any */
export function getDtsAnnotation(members?: ClassMember[]): AnnotationNames | undefined {
  const member = members?.find(m => m.isStatic && m.name in annotationTheta);
  return member ? annotationTheta[member.name] : undefined;
}


export function assertDeps(deps: R3DependencyMetadata[] | 'invalid' | null, name: string): asserts deps is R3DependencyMetadata[] {
  if (!deps || deps === 'invalid') {
    throw new AssertionError({ message: `Invalid depenancies in "${name}".` });
  }
}

export const exists = <T>(value: T | undefined | null): value is T => !!(value ?? false);
