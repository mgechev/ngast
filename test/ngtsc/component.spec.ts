import { WorkspaceSymbols } from '../../lib/ngtsc/workspace.symbols';
import { join } from 'path';
import { Element } from '@angular/compiler/src/render3/r3_ast';

function getFolder(name: string) {
  return join(__dirname, '/../../../test/fixture', name);
}

describe('WorkspaceSymbols', () => {
  describe('basic project', () => {
    let workspace: WorkspaceSymbols;
    const folder = getFolder('basic');

    beforeEach(() => workspace = new WorkspaceSymbols(`${folder}/tsconfig.json`));

    it('Should get the component', () => {
      const [component] = workspace.getAllComponents();
      expect(component.name).toBe('MainComponent');
      expect(component.isSymbol('Component')).toBeTrue();
      expect(component.metadata.selector).toBe('main-component');
    });
  });

  fdescribe('ngtsc-deps', () => {
    let workspace: WorkspaceSymbols;
    const folder = getFolder('ngtsc-deps');

    beforeEach(() => workspace = new WorkspaceSymbols(`${folder}/tsconfig.json`));

    it('Should get dependencies', () => {
      const [component] = workspace.getAllComponents();
      const [basic, primitive, token] = component.getDependencies();
      expect(basic.name).toBe('BasicProvider');
      expect(primitive.name).toBe('primitive');
      expect(token.name).toBe('TOKEN');
    });

    it('Should have templateAst', () => {
      const [component] = workspace.getAllComponents();
      const [root] = component.getTemplateAst();
      expect(root['name']).toBe('div');
    });

    it('Should get providers', () => {
      const [component] = workspace.getAllComponents();
      const [token] = component.getProviders();
      expect(token.name).toBe('TOKEN');
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
  });
});
