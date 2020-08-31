import { WorkspaceSymbols } from '../../lib/ngtsc/workspace.symbols';
import { join } from 'path';
import { Provider } from '../../lib/ngtsc/provider';

function getFolder(name: string) {
  return join(__dirname, '/../../../test/fixture', name);
}

describe('DirectiveSymbol', () => {
  describe('basic project', () => {
    let workspace: WorkspaceSymbols;
    const folder = getFolder('basic');

    beforeEach(() => workspace = new WorkspaceSymbols(`${folder}/tsconfig.json`));

    it('Should get the directive', () => {
      const [directive] = workspace.getAllDirectives();
      expect(directive.name).toBe('MainDirective');
      expect(directive.isSymbol('Directive')).toBeTrue();
      expect(directive.metadata.selector).toBe('[main]');
    });
  });

  describe('ngtsc-deps', () => {
    let workspace: WorkspaceSymbols;
    const folder = getFolder('ngtsc-deps');

    beforeEach(() => workspace = new WorkspaceSymbols(`${folder}/tsconfig.json`));

    it('Should get dependencies', () => {
      const [directive] = workspace.getAllDirectives();
      const [basic] = directive.getDependencies();
      expect(basic.name).toBe('BasicProvider');
    });

    it('Should get providers', () => {
      const [directive] = workspace.getAllDirectives();
      const [token] = directive.getProviders();
      expect(token.name).toBe('TOKEN');
      expect(token instanceof Provider).toBeTruthy()
      expect((token as Provider).metadata.useKey).toBe('useValue');
      expect((token as Provider).metadata.value).toBe(false);
    });
  });
});