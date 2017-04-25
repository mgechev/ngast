import * as ts from 'typescript';

import {ContextSymbols} from '../';
import {createProgramFromTsConfig} from './utils/create-program';
import {resourceResolver} from './utils/resource-resolver';
import { ErrorReporter } from '../lib/project-symbols';

const defaultErrorReporter: ErrorReporter = (e: any, path: string) => console.error(e, path);

describe('ProviderSymbol', () => {
  let program: ts.Program;

  beforeEach(() => {
    program = createProgramFromTsConfig(__dirname + '/../../test/fixture/routing/tsconfig.json');
  });

  it('should provide access to the module\'s providers', () => {
    const module = new ContextSymbols(program, resourceResolver, defaultErrorReporter).getModules().pop();
    const provider = module.getProviders().pop();
    expect(provider.symbol.name).toBe('APP_BOOTSTRAP_LISTENER');
  });

  it('should provide access to the provider\'s metadata', () => {
    const module = new ContextSymbols(program, resourceResolver, defaultErrorReporter).getModules().pop();
    const provider = module.getProviders().pop().getMetadata();
    expect(provider.useExisting).not.toBeFalsy();
  });

});
