import * as ts from 'typescript';

import {ContextSymbols} from '../';
import {createProgramFromTsConfig} from './utils/create-program';
import {resourceResolver} from './utils/resource-resolver';
import { ErrorReporter } from '../lib/project-symbols';

const defaultErrorReporter: ErrorReporter = (e: any, path: string) => console.error(e, path);

describe('ModuleSymbol', () => {
  let program: ts.Program;

  beforeEach(() => {
    program = createProgramFromTsConfig(__dirname + '/../../test/fixture/generic-config/tsconfig.json');
  });

  it('should get all modules', () => {
    const contextSymbols = new ContextSymbols(program, resourceResolver, defaultErrorReporter);
    const modules = contextSymbols.getModules();
    expect(modules.map(s => s.symbol.name).pop()).toBe('AppModule');
  });
});
