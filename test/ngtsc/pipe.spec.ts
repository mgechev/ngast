import { WorkspaceSymbols } from '../../lib/ngtsc/workspace.symbols';
import { join } from 'path';

function getFolder(name: string) {
  return join(__dirname, '/../../../test/fixture', name);
}

describe('PipeSymbol', () => {
  describe('basic project', () => {
    let workspace: WorkspaceSymbols;
    const folder = getFolder('basic');

    beforeEach(() => workspace = new WorkspaceSymbols(`${folder}/tsconfig.json`));

    it('Should get the pipe', () => {
      const [pipe] = workspace.getAllPipes();
      expect(pipe.name).toBe('MainPipe');
      expect(pipe.annotation).toBe('Pipe');
      expect(pipe.metadata!.pipeName).toBe('main');
    });
  });

  describe('ngtsc-deps', () => {
    let workspace: WorkspaceSymbols;
    const folder = getFolder('ngtsc-deps');

    beforeEach(() => workspace = new WorkspaceSymbols(`${folder}/tsconfig.json`));

    it('Should get dependencies', () => {
      const [pipe] = workspace.getAllPipes();
      const [basic] = pipe.getDependencies();
      expect(basic.name).toBe('BasicProvider');
    });

  });
});
