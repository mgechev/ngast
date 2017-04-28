import * as ts from 'typescript';

import {ProjectSymbols} from '../';
import {createProgramFromTsConfig} from './utils/create-program';
import {resourceResolver} from './utils/resource-resolver';

const defaultErrorReporter = (e: any, path: string) => console.error(e, path);

describe('ProviderSymbol', () => {
  let program: ts.Program;

  describe('basic example', () => {
    beforeEach(() => {
      program = createProgramFromTsConfig(__dirname + '/../../test/fixture/routing/tsconfig.json');
    });

    it('should provide access to the module\'s providers', () => {
      const module = new ProjectSymbols(program, resourceResolver, defaultErrorReporter).getModules().pop();
      const provider = module.getProviders().pop();
      expect(provider.getMetadata().token.identifier.reference.name).toBe('APP_BOOTSTRAP_LISTENER');
    });

    it('should provide access to the provider\'s metadata', () => {
      const module = new ProjectSymbols(program, resourceResolver, defaultErrorReporter).getModules().pop();
      const provider = module.getProviders().pop().getMetadata();
      expect(provider.useExisting).not.toBeFalsy();
    });
  });

  describe('basic primitive token example', () => {
    beforeEach(() => {
      program = createProgramFromTsConfig(__dirname + '/../../test/fixture/basic-primitive-token/tsconfig.json');
    });

    it('should discover transitive dependencies', () => {
      const module = new ProjectSymbols(program, resourceResolver, defaultErrorReporter).getModules().pop();
      const providers = module.getProviders();
      const dependencyProvider = providers.pop();
      const dependentProvider = providers.pop();
      expect(dependentProvider.getDependencies().pop()
        .getMetadata().token.identifier.reference.name).toBe('DependencyProvider');
    });

    it('should discover directive transitive dependencies', () => {
      const module = new ProjectSymbols(program, resourceResolver, defaultErrorReporter).getModules().pop();
      const dirs = module.getDeclaredDirectives();
      // console.log(dirs.pop().getDependencies().pop().getDependencies()[0].getMetadata().token);
      // const dependencyProvider = providers.pop();
      // const dependentProvider = providers.pop();
      // expect(dependentProvider.getDependencies().pop()
      //   .getMetadata().token.identifier.reference.name).toBe('DependencyProvider');
    });

  });

});
