import { ProjectSymbols } from '../';
import { resourceResolver } from './utils/resource-resolver';

const defaultErrorReporter = (e: any, path: string) => console.error(e, path);

describe('ModuleSymbol', () => {
  let program: string;

  describe('basic specs', () => {
    beforeEach(() => {
      program = __dirname + '/../../test/fixture/generic-config/tsconfig.json';
    });

    it('should get all modules', () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
      const modules = contextSymbols.getModules();
      const moduleNames = modules.map(s => s.symbol.name);
      expect(moduleNames.includes('AppModule')).toBeTruthy();
      expect(moduleNames.includes('AboutModule')).toBeTruthy();
    });
  });

  describe('file import specs', () => {
    beforeEach(() => {
      program = __dirname + '/../../test/fixture/referenced-root-module/tsconfig.json';
    });

    it('should get all modules', () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
      const modules = contextSymbols.getModules();
      const moduleNames = modules.map(s => s.symbol.name);
      expect(moduleNames.includes('AppModule')).toBeTruthy();
      expect(moduleNames.includes('AboutModule')).toBeTruthy();
    });
  });

  // describe('lazy modules', () => {
  //   beforeEach(() => {
  //     program = createProgramFromTsConfig('/Users/mgechev/Desktop/ngast-issue-repro/src/tsconfig.app.json');

  //     factory = {
  //       create(files: string[]) {
  //         return createProgramFromTsConfig('/Users/mgechev/Desktop/ngast-issue-repro/src/tsconfig.app.json', files);
  //       }
  //     };
  //   });

  //   it('should get all modules', () => {
  //     const project = new ProjectSymbols(factory, resourceResolver)
  //     // const contextSymbols = new ContextSymbols(program, resourceResolver, defaultErrorReporter);
  //     const modules = project.getRootContext().getModules();
  //     const contexts = project.getLazyLoadedContexts()
  //     console.log(contexts[0].getModules().map(m => m.symbol.name));
  //     console.log(modules.map(s => s.symbol.name));
  //   });
  // });
});
