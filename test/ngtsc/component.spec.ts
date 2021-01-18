import { WorkspaceSymbols } from '../../lib/ngtsc/workspace.symbols';
import { join } from 'path';
import { Provider } from '../../lib/ngtsc/provider';
import { TemplateNode } from '../../lib/ngtsc/template-transform.visitor';

function getFolder(name: string) {
  return join(__dirname, '/../../../test/fixture', name);
}

describe('ComponentSymbol', () => {
  describe('basic project', () => {
    let workspace: WorkspaceSymbols;
    const folder = getFolder('basic');

    beforeEach(() => workspace = new WorkspaceSymbols(`${folder}/tsconfig.json`));

    it('Should get the component', () => {
      const [component] = workspace.getAllComponents();
      expect(component.name).toBe('MainComponent');
      expect(component.annotation).toBe('Component');
      expect(component.metadata.selector).toBe('main-component');
    });
  });

  describe('ngtsc-deps', () => {
    let workspace: WorkspaceSymbols;
    const folder = getFolder('ngtsc-deps');

    beforeEach(() => workspace = new WorkspaceSymbols(`${folder}/tsconfig.json`));

    it('Should get dependencies', () => {
      const [component] = workspace.getAllComponents();
      const [basic, primitive] = component.getDependencies();
      expect(basic.name).toBe('BasicProvider');
      expect(primitive.name).toBe('primitive');
    });

    it('Should have templateAst', () => {
      const [component] = workspace.getAllComponents();
      const [root] = component.getTemplateAst();
      expect((root as TemplateNode).name).toBe('div');
    });

    it('Should get providers', () => {
      const [component] = workspace.getAllComponents();
      const [token] = component.getProviders();
      expect(token.name).toBe('TOKEN');
      expect(token instanceof Provider).toBeTruthy()
      expect((token as Provider).metadata.useKey).toBe('useValue');
      expect((token as Provider).metadata.value).toBe(true);
    })

    it('Should get the scope selector', () => {
      const [component] = workspace.getAllComponents();
      const selectors = component.getSelectorScope();
      // Own selector
      expect(selectors.includes('main-component')).toBeTruthy();
      // Declaration selector
      expect(selectors.includes('[main]')).toBeTruthy();
      // DTS
      expect(selectors.includes('mat-accordion')).toBeTruthy();
    })

    it('Should get the scope pipe', () => {
      const [component] = workspace.getAllComponents();
      const selectors = component.getPipeScope();
      // Local pipe
      expect(selectors.includes('main')).toBeTrue();
      // DTS
      expect(selectors.includes('date')).toBeTrue();
    })
  });

  describe('external deps', () => {
    let workspace: WorkspaceSymbols;
    const folder = getFolder('ngtsc-external-deps');

    beforeEach(() => workspace = new WorkspaceSymbols(`${folder}/tsconfig.json`));

    it('Should get external providers', () => {
      const [component] = workspace.getAllComponents();
      const [basic, primitive] = component.getDependencies();
      expect(basic.name).toBe('BasicProvider');
      expect(primitive.name).toBe('primitive');
    })
  })

  describe('template deps', () => {
    let workspace: WorkspaceSymbols;
    const folder = getFolder('deps');

    beforeEach(() => workspace = new WorkspaceSymbols(`${folder}/tsconfig.json`));

    it('Should resolve components used in template', () => {
      const [component] = workspace.getAllComponents();
      const [button] = component.getTemplateAst() as TemplateNode[];
      expect(button.component).not.toBeFalsy();
    });
  })
});
