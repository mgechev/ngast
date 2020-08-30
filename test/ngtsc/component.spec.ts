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

    it('Should get the component', () => {
      const [component] = workspace.getAllComponents();
      expect(component.name).toBe('MainComponent');
      expect(component.isSymbol('Component')).toBeTrue();
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
  });
});
