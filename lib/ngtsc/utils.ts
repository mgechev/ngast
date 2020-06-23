import { ClassDeclaration as ngClassDeclaration, ClassMember } from '@angular/compiler-cli/src/ngtsc/reflection';
import { isCallExpression, ClassDeclaration as tsClassDeclaration, Decorator, NodeArray, isIdentifier, Identifier } from 'typescript';
import { WrappedNodeExpr, R3DependencyMetadata } from '@angular/compiler';

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

export function hasDecoratorName(node: ClassDeclaration, name: AnnotationNames) {
  return node.decorators?.some(decorator => getDecoratorName(decorator) === name);
}

/** Verify if class is decorated with an annotation */
export function hasAnnotationDecorator(node: ClassDeclaration) {
  return node.decorators?.some(decorator => annotationNames.includes(getDecoratorName(decorator) as any));
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


export function getDepNode(dep: R3DependencyMetadata): Identifier |undefined {
  if ((dep.token instanceof WrappedNodeExpr) && isIdentifier(dep.token.node)) {
    return dep.token.node;
  }
}
