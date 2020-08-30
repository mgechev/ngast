import { ProjectSymbols } from '../../lib/ngcc';
import { resourceResolver } from '../utils/resource-resolver';
import { getConfig } from './get-tsconfig';

const defaultErrorReporter = (e: any, path: string) => console.error(e, path);

describe('ProviderSymbol', () => {
  let program: string;

  describe('basic example', () => {
    beforeEach(() => {
      program = getConfig('routing');
    });

    it(`should provide access to the module's providers`, () => {
      const module = new ProjectSymbols(program, resourceResolver, defaultErrorReporter)
        .getModules()
        .filter(m => m.getProviders().length > 0)
        .pop();
      const provider = module.getProviders().pop();
      expect(typeof provider.getMetadata().token.identifier.reference.name).toBe('string');
    });

    it(`should provide access to the provider's metadata`, () => {
      const module = new ProjectSymbols(program, resourceResolver, defaultErrorReporter)
        .getModules()
        .filter(m => m.symbol.name === 'AppModule')
        .pop();
      const provider = module
        .getProviders()
        .pop()
        .getMetadata();
      expect(provider.useExisting).not.toBeFalsy();
    });
  });

  describe('basic primitive token example', () => {
    beforeEach(() => {
      program = getConfig('basic-primitive-token');
    });

    it('should discover transitive dependencies', () => {
      const module = new ProjectSymbols(program, resourceResolver, defaultErrorReporter)
        .getModules()
        .filter(m => m.symbol.name === 'AppModule')
        .pop();
      const basicProvider = module!
        .getProviders()
        .filter(p => p.getMetadata().token.identifier.reference.name === 'BasicProvider')
        .pop();

      expect(basicProvider.getDependencies()[0].getMetadata().token.identifier.reference.name).toEqual(
        'DependencyProvider'
      );
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
