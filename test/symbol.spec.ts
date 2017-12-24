import { StaticSymbol } from '@angular/compiler';
import { Symbol } from '../';
import { createProgram } from './utils/create-in-memory-program';

describe('Symbol', () => {
  it('should return the source node', () => {
    const project = {
      'a.ts': `
        class A {}
        class B {}
      `
    };
    const program = createProgram(project, {});
    const staticSymbolA = new StaticSymbol('a.ts', 'A', []);
    const sa = new Symbol(program, staticSymbolA);
    const staticSymbolB = new StaticSymbol('a.ts', 'B', []);
    const sb = new Symbol(program, staticSymbolB);
    expect(sa.getNode().name.text).toBe('A');
    expect(sb.getNode().name.text).toBe('B');
    const nonExistingStaticSymbol = new StaticSymbol('a.ts', 'NonExisting', []);
    const nonExistingSymbol = new Symbol(program, nonExistingStaticSymbol);
    expect(nonExistingSymbol.getNode()).toBe(undefined);
  });

  it('should not fail for non-existing symbols', () => {
    const project = {
      'a.ts': `
        class A {}
        class B {}
      `
    };
    const program = createProgram(project, {});
    const nonExistingStaticSymbol = new StaticSymbol('a.ts', 'NonExisting', []);
    const nonExistingSymbol = new Symbol(program, nonExistingStaticSymbol);
    expect(nonExistingSymbol.getNode()).toBe(undefined);
  });
});
