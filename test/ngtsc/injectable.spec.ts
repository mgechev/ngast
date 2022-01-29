import { WorkspaceSymbols } from '../../lib/ngtsc/workspace.symbols';
import { join } from 'path';

function getFolder(name: string) {
  return join(__dirname, '/../../../test/fixture', name);
}

describe('InjectionSymbol', () => {
  describe('basic project', () => {
    let workspace: WorkspaceSymbols;
    const folder = getFolder('basic');

    beforeEach(() => workspace = new WorkspaceSymbols(`${folder}/tsconfig.json`));

    it('Should get the injectables', () => {
      // None decorated @Injectable are not visible since v9
      const [basicView] = workspace.getAllInjectable();
      expect(basicView.name).toBe('BasicViewProvider');
      expect(basicView.annotation).toBe('Injectable');
    });
  });

  describe('ngtsc-deps', () => {
    let workspace: WorkspaceSymbols;
    const folder = getFolder('ngtsc-deps');

    beforeEach(() => workspace = new WorkspaceSymbols(`${folder}/tsconfig.json`));

    it('Should get dependencies', () => {
      const [_, composite] = workspace.getAllInjectable();
      const [basic, primitive] = composite.getDependencies();
      expect(basic.name).toBe('BasicProvider');
      expect(primitive.name).toBe('primitive');
    });

    it('Should get module providers', () => {
      const [m] = workspace.getAllModules();
      const provider = m.getProviders().filter(p => p.name === 'BasicProvider').pop();
      expect(provider).not.toBeUndefined();
    });
  });
});
