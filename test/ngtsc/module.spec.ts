import { WorkspaceSymbols } from '../../lib/ngtsc/workspace.symbols';
import { join } from 'path';

function getFolder(name: string) {
  return join(__dirname, '/../../../test/fixture', name);
}

describe('WorkspaceSymbols', () => {
  describe('basic project', () => {
    let workspace: WorkspaceSymbols;
    const folder = getFolder('basic');

    beforeEach(() => workspace = new WorkspaceSymbols(`${folder}/tsconfig.json`));

    it('Create module from path', () => {
      const [module] = workspace.getAllModules();
      expect(module.name).toBe('AppModule');
      expect(module.isAnalysed).toBeFalsy();
    });

    it('analyse one module', () => {
      const [module] = workspace.getAllModules();
      expect(module.isAnalysed).toBeFalsy();
      module.analyse();
      // Scope related API fails because of @angular/core not beeing compiled with Ivy
      // expect(module.isAnalysed).toBeTruthy();
    });

    it('Get declarations with right Symbol', () => {
      const [module] = workspace.getAllModules();
      const [declaration] = module.getDeclarations();
      expect(declaration.isSymbol('Component')).toBeTruthy();
      expect(declaration.name).toBe('MainComponent');
    });

    it('Get imports', () => {
      const [module] = workspace.getAllModules();
      const [common, browser] = module.getImports();
      expect(common.name).toBe('CommonModule');
      expect(browser.name).toBe('BrowserModule');
    });

    it('Get exports with right Symbol', () => {
      const [module] = workspace.getAllModules();
      const [exports] = module.getExports();
      expect(exports.isSymbol('Component')).toBeTruthy();
      expect(exports.name).toBe('MainComponent');
    });

    it('Get bootstrap component', () => {
      const [module] = workspace.getAllModules();
      const [bootstrap] = module.getBootstap();
      expect(bootstrap.name).toBe('MainComponent');
    });
  });

  describe('basic primitive token', () => {
    let workspace: WorkspaceSymbols;
    const folder = getFolder('basic-primitive-token');

    beforeEach(() => workspace = new WorkspaceSymbols(`${folder}/tsconfig.json`));

    it('Get providers', () => {
      const [module] = workspace.getAllModules();
      const providers = module.getProviders();
      const meta = providers[1].analysis;
      expect(providers.some(p => p.name === 'BasicProvider')).toBeTruthy();
      expect(providers.some(p => p.name === 'DependencyProvider')).toBeTruthy();
    });
  });

  // Didn't manage to verify that analysis is throwing
  // describe('deps', () => {
  //   let workspace: WorkspaceSymbols;
  //   const folder = getFolder('deps');

  //   beforeEach(() => workspace = new WorkspaceSymbols(`${folder}/tsconfig.json`));

  //   it('Should throw for undecorated class in provider', () => {
  //     const [module] = workspace.getAllModules();
  //     try {
  //       module.analysis;
  //     } catch (err) {
  //       expect(err).toBe('An error occured during analysis of "AppModule". Check diagnostics in [NgModuleSymbol].diagnostics.');
  //       expect(module.diagnostics).toBeTruthy();
  //     }
  //   });
  // });

  describe('ngtsc-deps', () => {
    let workspace: WorkspaceSymbols;
    const folder = getFolder('ngtsc-deps');

    beforeEach(() => workspace = new WorkspaceSymbols(`${folder}/tsconfig.json`));

    it('Should find all providers', () => {
      const [module] = workspace.getAllModules();
      const providers = module.getProviders();
      expect(providers.some(p => p.name === 'BasicProvider')).toBeTruthy();
      expect(providers.some(p => p.name === 'CompositeProvider')).toBeTruthy();
      // Todo : what about the { useValue } ???
    });
  });

  describe('ngtsc-routes', () => {
    let workspace: WorkspaceSymbols;
    const folder = getFolder('ngtsc-routes');

    beforeEach(() => workspace = new WorkspaceSymbols(`${folder}/tsconfig.json`));

    it('Find all routes', () => {
      const module = workspace.getAllModules().find(m => m.name === 'AppModule');
      const routes = module.getLazyRoutes();
      expect(routes.length).toBe(3);
    });
  });
});
