import * as ts from 'typescript';

import {ContextSymbols} from '../';
import {createProgramFromTsConfig} from './utils/create-program';
import {resourceResolver} from './utils/resource-resolver';

describe('DirectiveSymbol', () => {
  describe('inline metadata', () => {
    let program: ts.Program;

    beforeEach(() => {
      program = createProgramFromTsConfig(__dirname + '/../../test/fixture/basic/tsconfig.json');
    });

    it('should provide access to the directive\'s metadata', () => {
      const contextSymbols = new ContextSymbols(program, resourceResolver);
      const directive = contextSymbols.getDirectives().pop();
      expect(directive.getNonResolvedMetadata().selector).toBe('main-component');
    });

    it('should find the ts.Node', () => {
      const contextSymbols = new ContextSymbols(program, resourceResolver);
      const directive = contextSymbols.getDirectives().pop();
      expect(directive.getNode().name.text).toBe('MainComponent');
    });

    it('should return reference to the analyzed modules', () => {
      const contextSymbols = new ContextSymbols(program, resourceResolver);
      const directive = contextSymbols.getDirectives().pop();
      expect(directive.getModule().type.reference.name).toBe('AppModule');
      expect(directive.getModule().type.reference.filePath.endsWith('index.ts')).toBeTruthy();
    });

    it('should find if a directive is a component', () => {
      const contextSymbols = new ContextSymbols(program, resourceResolver);
      const directive = contextSymbols.getDirectives().pop();
      expect(directive.isComponent()).toBeTruthy();
    });

    it('should find the directive\'s context', () => {
      const contextSymbols = new ContextSymbols(program, resourceResolver);
      const directive = contextSymbols.getDirectives().pop();
      expect(directive.getDirectiveContext().directives.length).not.toBe(0);
      expect(directive.getDirectiveContext().pipes.length).not.toBe(0);
    });

    it('should parse template based on the context', () => {
      const contextSymbols = new ContextSymbols(program, resourceResolver);
      const directive = contextSymbols.getDirectives().pop();
      const ast = directive.getTemplateAst();
      expect(ast.errors.length).toBe(0);
      expect((ast.templateAst[0] as any).directives[0].directive.selector).toBe('[ngIf]');
    });
  });

  describe('external metadata and directives', () => {
    let program: ts.Program;

    beforeEach(() => {
      program = createProgramFromTsConfig(__dirname + '/../../test/fixture/routing/tsconfig.json');
    });

    it('should read external templates', () => {
      const contextSymbols = new ContextSymbols(program, resourceResolver);
      const directive = contextSymbols.getDirectives().pop();
      expect(directive.getResolvedMetadata().template).toBe('{{ a | samplePipe }}\n<div *ngIf="visible">Hello world</div>\n');
      expect(directive.getResolvedMetadata().templateUrl.endsWith('main.component.html')).toBeTruthy();
    });

    it('should find directives', () => {
      const contextSymbols = new ContextSymbols(program, resourceResolver);
      expect(contextSymbols.getDirectives().some(d => d.getNonResolvedMetadata().selector === '[dir]')).toBeTruthy();
    });

    it('should find directive\'s ts.Node', () => {
      const contextSymbols = new ContextSymbols(program, resourceResolver);
      const dir = contextSymbols.getDirectives().filter(d => d.getNonResolvedMetadata().selector === '[dir]').pop();
      expect(dir.getNode().name.text).toBe('SampleDirective');
    });

    it('should work with custom pipes', () => {
      const contextSymbols = new ContextSymbols(program, resourceResolver);
      const directive = contextSymbols.getDirectives().pop();
      const ast = directive.getTemplateAst();
      expect(ast.errors.length).toBe(0);
      expect((ast.templateAst[0] as any).value.ast.expressions[0].name).toBe('samplePipe');
    });
  });

  describe('external styles', () => {
    let program: ts.Program;

    beforeEach(() => {
      program = createProgramFromTsConfig(__dirname + '/../../test/fixture/routing/tsconfig.json');
    });

    it('should work inline styles', () => {
      const contextSymbols = new ContextSymbols(program, resourceResolver);
      const directive = contextSymbols.getDirectives().pop();
      const metadata = directive.getNonResolvedMetadata().template;
      expect(Array.isArray(metadata.styles)).toBeTruthy();
      expect(metadata.styles.length).toBe(1);
      expect(metadata.styles[0].indexOf('inline')).toBeTruthy();
      expect(metadata.styleUrls.length).toBe(2);
    });

    it('should work with external styles', () => {
      const contextSymbols = new ContextSymbols(program, resourceResolver);
      const directive = contextSymbols.getDirectives().pop();
      const metadata = directive.getResolvedMetadata();
      expect(Array.isArray(metadata.styles)).toBeTruthy();
      expect(metadata.styles.length).toBe(3);
      expect(metadata.styles[0].indexOf('inline') >= 0).toBeTruthy();
      expect(metadata.styles[1].indexOf('.s1') >= 0).toBeTruthy();
      expect(metadata.styles[2].indexOf('.s2') >= 0).toBeTruthy();
      expect(metadata.styleUrls.length).toBe(2);
    });
  });
});
