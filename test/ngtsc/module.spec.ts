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

    it('Module is analyzed after getAllModule', () => {
      const [module] = workspace.getAllModules();
      expect(module.name).toBe('AppModule');
      expect(module.isAnalysed).toBeTruthy();
    });

    it('Get declarations with right Symbol', () => {
      const [module] = workspace.getAllModules();
      const [component, directive, pipe] = module.getDeclarations();
      expect(component.annotation).toBe('Component');
      expect(component.name).toBe('MainComponent');
      expect(directive.annotation).toBeTruthy('Directive');
      expect(directive.name).toBe('MainDirective');
      expect(pipe.annotation).toBe('Pipe');
      expect(pipe.name).toBe('MainPipe');
    });

    it('Get imports', () => {
      const [module] = workspace.getAllModules();
      const [common, browser, local] = module.getImports();
      expect(common.name).toBe('CommonModule');
      expect(browser.name).toBe('BrowserModule');
    });

    it('Get exports with right Symbol', () => {
      const [module] = workspace.getAllModules();
      const [exports] = module.getExports();
      expect(exports.annotation).toBe('Component');
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

    it('Get all providers', () => {
      const [module] = workspace.getAllModules();
      const [basic, dependency] = module.getProviders();
      expect(basic.name).toBe('BasicProvider');
      expect(dependency.name).toBe('DependencyProvider');
    });
  });

  describe('ngtsc-deps', () => {
    let workspace: WorkspaceSymbols;
    const folder = getFolder('ngtsc-deps');

    beforeEach(() => workspace = new WorkspaceSymbols(`${folder}/tsconfig.json`));

    it('Should find all providers', () => {
      const [module] = workspace.getAllModules();
      const [composite, basic, primitive, token] = module.getProviders();
      expect(composite.name).toBe('CompositeProvider');
      expect(basic.name).toBe('BasicProvider');
      expect(primitive.name).toBe('primitive');
    });
  });

});
