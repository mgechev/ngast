import { WorkspaceSymbols } from '../../lib/ngtsc/workspace.symbols';
import { join } from 'path';

describe('WorkspaceSymbols', () => {
  let workspace: WorkspaceSymbols;
  describe('basic project', () => {
    const basicFolder = join(__dirname, '/../../../test/fixture/basic');

    beforeEach(() => workspace = new WorkspaceSymbols(`${basicFolder}/tsconfig.json`));

  });
});
