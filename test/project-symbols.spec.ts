import {ProjectSymbols, ProgramFactory} from '../';
import {createProgramFromTsConfig} from './utils/create-program';
import {resourceResolver} from './utils/resource-resolver';

describe('ProjectSymbols', () => {
  describe('basic project', () => {
    let factory: ProgramFactory;

    beforeEach(() => {
      factory = {
        create(files: string[]) {
          return createProgramFromTsConfig(__dirname + '/../../test/fixture/basic/tsconfig.json', files);
        }
      };
    });

    it('should return the main context', () => {
      const project = new ProjectSymbols(factory, resourceResolver);
      const rootContext = project.getRootContext();
      expect(rootContext).not.toBeNull();
      expect(rootContext.getContextSummary().type.reference.name).toBe('AppModule');
    });
  });

  describe('complex project with lazy loading', () => {
    let factory: ProgramFactory;

    beforeEach(() => {
      factory = {
        create(files: string[]) {
          return createProgramFromTsConfig(__dirname + '/../../test/fixture/routing/tsconfig.json', files);
        }
      };
    });

    it('should return proper main context', () => {
      const project = new ProjectSymbols(factory, resourceResolver);
      const rootContext = project.getRootContext();
      expect(rootContext).not.toBeNull();
      expect(rootContext.getContextSummary().type.reference.name).toBe('AppModule');
    });

    it('should return all the referenced lazy modules', () => {
      const project = new ProjectSymbols(factory, resourceResolver);
      const lazyContexts = project.getLazyLoadedContexts();
      expect(lazyContexts).not.toBeNull();
      expect(lazyContexts.length).toBe(3);
      expect(lazyContexts[0].getContextSummary().type.reference.name).toBe('AppModule');
      expect(lazyContexts[1].getContextSummary().type.reference.name).toBe('LazyAModule');
      expect(lazyContexts[2].getContextSummary().type.reference.name).toBe('LazyBModule');
    });
  });

  describe('transitive lazy modules', () => {
    let factory: ProgramFactory;

    beforeEach(() => {
      factory = {
        create(files: string[]) {
          return createProgramFromTsConfig(__dirname + '/../../test/fixture/nested-lazy/tsconfig.json', files);
        }
      };
    });

    it('should return proper main context', () => {
      const project = new ProjectSymbols(factory, resourceResolver);
      const rootContext = project.getRootContext();
      expect(rootContext).not.toBeNull();
      expect(rootContext.getContextSummary().type.reference.name).toBe('AppModule');
    });

    it('should return all the referenced lazy modules', () => {
      const project = new ProjectSymbols(factory, resourceResolver);
      const lazyContexts = project.getLazyLoadedContexts();
      expect(lazyContexts).not.toBeNull();
      expect(lazyContexts.length).toBe(4);
      expect(lazyContexts[0].getContextSummary().type.reference.name).toBe('AppModule');
      expect(lazyContexts[1].getContextSummary().type.reference.name).toBe('LazyAModule');
      expect(lazyContexts[2].getContextSummary().type.reference.name).toBe('LazyBModule');
      expect(lazyContexts[3].getContextSummary().type.reference.name).toBe('LazyCModule');
    });
  });
});
