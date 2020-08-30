import * as ts from 'typescript';
// import {writeFileSync} from 'fs';

import { ProjectSymbols } from '../../lib/ngcc';
import { createProgramFromTsConfig } from '../utils/create-program';
import { resourceResolver } from '../utils/resource-resolver';
import { getConfig } from './get-tsconfig';

const defaultErrorReporter = (e: any, path: string) => console.error(e, path);

describe('ContextSymbols', () => {
  describe('basic project', () => {
    let program: string;

    beforeEach(() => {
      program = getConfig('basic');
    });

    it('should return reference to the analyzed modules', () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
      const result = contextSymbols.getAnalyzedModules();
      expect(result.ngModules.some(m => m.type.reference.name === 'AppModule')).toBeTruthy();
      expect(result.ngModules.some(m => m.type.reference.name === 'BrowserModule')).toBeTruthy();
      expect(result.ngModules.some(m => m.type.reference.name === 'CommonModule')).toBeTruthy();
    });

    it('should return reference to the registered directives', () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
      const result = contextSymbols.getDirectives();
      expect(result.some(m => m.symbol.name === 'MainComponent')).toBeTruthy();
    });

    it('should return set of all modules', () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
      const result = contextSymbols.getModules();
      expect(result.some(m => m.symbol.name === 'AppModule')).toBeTruthy();
    });

    it('should return set of pipes', () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
      const result = contextSymbols.getPipes();
      expect(result.some(p => p.symbol.name === 'DecimalPipe')).toBeTruthy();
    });

    it('should not return duplicate modules', () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
      const modules = contextSymbols.getModules();
      const modulesMap = {};
      modules.forEach(m => {
        const n = m.symbol.name;
        modulesMap[n] = modulesMap[n] || 0;
        modulesMap[n] += 1;
        expect(modulesMap[n]).toBe(1);
      });
    });

    it('should be able to discover all providers', () => {
      const contextSymbols = new ProjectSymbols(
        getConfig('basic'),
        resourceResolver,
        defaultErrorReporter
      );
      const p = contextSymbols.getProviders().map(p => p.getMetadata().token.identifier.reference.name);
      expect(p.some(n => n === 'BasicViewProvider')).toBeTruthy();
      expect(p.some(n => n === 'BasicProvider')).toBeTruthy();
    });
  });

  describe('routing project', () => {
    let program: ts.Program;

    beforeEach(() => {
      program = createProgramFromTsConfig(getConfig('routing'));
    });
  });
});
