import * as ts from 'typescript';

import {ProjectSymbols} from '../';
import {createProgramFromTsConfig} from './utils/create-program';
import {resourceResolver} from './utils/resource-resolver';

const defaultErrorReporter = (e: any, path: string) => console.error(e, path);

describe('DirectiveSymbol', () => {
  describe('inline metadata', () => {
    let program: ts.Program;

    beforeEach(() => {
      program = createProgramFromTsConfig(__dirname + '/../../test/fixture/basic/tsconfig.json');
    });

    it('should provide access to the directive\'s metadata', () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
      const directive = contextSymbols.getDirectives().pop();
      expect(directive.getNonResolvedMetadata().selector).toBe('main-component');
    });

    it('should find the ts.Node', () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
      const directive = contextSymbols.getDirectives().pop();
      expect(directive.getNode().name.text).toBe('MainComponent');
    });

    it('should return reference to the analyzed modules', () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
      const directive = contextSymbols.getDirectives().pop();
      expect(directive.getModule().type.reference.name).toBe('AppModule');
      expect(directive.getModule().type.reference.filePath.endsWith('index.ts')).toBeTruthy();
    });

    it('should find if a directive is a component', () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
      const directive = contextSymbols.getDirectives().pop();
      expect(directive.isComponent()).toBeTruthy();
    });

    it('should find the directive\'s context', () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
      const directive = contextSymbols.getDirectives().pop();
      expect(directive.getDirectiveContext().directives.length).not.toBe(0);
      expect(directive.getDirectiveContext().pipes.length).not.toBe(0);
    });

    it('should parse template based on the context', () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
      const directive = contextSymbols.getDirectives().pop();
      const ast = directive.getTemplateAst();
      expect(ast.errors.length).toBe(0);
      expect((ast.templateAst[0] as any).directives[0].directive.selector).toBe('[ngIf]');
    });

    it('should find view providers', () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
      const directive = contextSymbols.getDirectives().pop();
      expect(directive.getViewProviders().map(v => v.symbol.name).pop()).toBe('BasicViewProvider');
    });
  });

  describe('external metadata and directives', () => {
    let program: ts.Program;

    beforeEach(() => {
      program = createProgramFromTsConfig(__dirname + '/../../test/fixture/routing/tsconfig.json');
    });

    it('should read external templates', () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
      const directive = contextSymbols.getDirectives().pop();
      expect(directive.getResolvedMetadata().template).toBe('{{ a | samplePipe }}\n<div *ngIf="visible">Hello world</div>\n');
      expect(directive.getResolvedMetadata().templateUrl.endsWith('main.component.html')).toBeTruthy();
    });

    it('should find directives', () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
      expect(contextSymbols.getDirectives().some(d => d.getNonResolvedMetadata().selector === '[dir]')).toBeTruthy();
    });

    it('should find directive\'s ts.Node', () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
      const dir = contextSymbols.getDirectives().filter(d => d.getNonResolvedMetadata().selector === '[dir]').pop();
      expect(dir.getNode().name.text).toBe('SampleDirective');
    });

    it('should work with custom pipes', () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
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
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
      const directive = contextSymbols.getDirectives().pop();
      const metadata = directive.getNonResolvedMetadata().template;
      expect(Array.isArray(metadata.styles)).toBeTruthy();
      expect(metadata.styles.length).toBe(1);
      expect(metadata.styles[0].indexOf('inline')).toBeTruthy();
      expect(metadata.styleUrls.length).toBe(2);
    });

    it('should work with external styles', () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
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

  describe('directive deps', () => {
    let program: ts.Program;

    beforeEach(() => {
      program = createProgramFromTsConfig(__dirname + '/../../test/fixture/directive-deps/tsconfig.json');
    });

    it('should find directive dependencies', () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
      const directive = contextSymbols.getDirectives().pop();
      expect(directive.getDependencies()[0].symbol.name).toBe('Renderer');
    });

    it('should work with directive with no deps', () => {
      const currentProgram = createProgramFromTsConfig(__dirname + '/../../test/fixture/basic/tsconfig.json');
      const contextSymbols = new ProjectSymbols(currentProgram, resourceResolver, defaultErrorReporter);
      const directive = contextSymbols.getDirectives().pop();
      expect(directive.getDependencies().length).toBe(0);
    });

    // it('should work with directive with no providers', () => {
    //   const currentProgram = createProgramFromTsConfig(__dirname + '/../../test/fixture/basic/tsconfig.json');
    //   const contextSymbols = new ContextSymbols(currentProgram, resourceResolver, defaultErrorReporter);
    //   const directive = contextSymbols.getDirectives().pop();
    //   expect(directive.getProviders().length).toBe(0);
    // });

    // it('should find directive providers and view providers', () => {
    //   const contextSymbols = new ContextSymbols(program, resourceResolver, defaultErrorReporter);
    //   const directive = contextSymbols.getDirectives().pop();
    //   expect(directive.getProviders()[0].symbol.name).toBe('SampleProvider');
    //   expect(directive.getViewProviders()[0].symbol.name).toBe('SampleViewProvider');
    // });
  });
});
