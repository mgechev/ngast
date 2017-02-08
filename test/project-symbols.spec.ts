import * as ts from 'typescript';

import {ProjectSymbols} from '../';
import {createProgramFromTsConfig} from '../demo/create-program';
import {resourceResolver} from '../demo/resource-resolver';

describe('ProjectSymbols', () => {
  describe('basic project', () => {
    let program: ts.Program;

    beforeEach(() => {
      program = createProgramFromTsConfig(__dirname + '/../../test/fixture/basic/tsconfig.json');
    });

    it('should return project summary', () => {
      const projectSymbols = new ProjectSymbols(program, resourceResolver);
      const summary = projectSymbols.getProjectSummary();
      expect(summary.type.reference.name).toBe('AppModule');
      expect(summary.entryComponents[0].reference.name).toBe('MainComponent');
      expect(summary.exportedDirectives[0].reference.name).toBe('MainComponent');
      expect(summary.modules[0].reference.name).toBe('CommonModule');
    });

    it('should return reference to the analyzed modules', () => {
      const projectSymbols = new ProjectSymbols(program, resourceResolver);
      const result = projectSymbols.getAnalyzedModules();
      expect(result.ngModules.some(m => m.type.reference.name === 'AppModule')).toBeTruthy();
      expect(result.ngModules.some(m => m.type.reference.name === 'BrowserModule')).toBeTruthy();
      expect(result.ngModules.some(m => m.type.reference.name === 'CommonModule')).toBeTruthy();
    });

    it('should return reference to the registered directives', () => {
      const projectSymbols = new ProjectSymbols(program, resourceResolver);
      const result = projectSymbols.getDirectives();
      expect(result.some(m => m.symbol.name === 'MainComponent')).toBeTruthy();
    });

    it('should return set of all modules', () => {
      const projectSymbols = new ProjectSymbols(program, resourceResolver);
      const result = projectSymbols.getModules();
      expect(result.some(m => m.type.reference.name === 'AppModule')).toBeTruthy();
    });

    it('should return set of pipes', () => {
      const projectSymbols = new ProjectSymbols(program, resourceResolver);
      const result = projectSymbols.getPipes();
      expect(result.some(p => p.symbol.name === 'DecimalPipe')).toBeTruthy();
    });
  });
});
