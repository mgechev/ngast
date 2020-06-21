import { WorkspaceSymbols } from '../../lib/ngtsc/workspace-symbols';
import { join } from 'path';

describe('WorkspaceSymbols', () => {
  let workspace: WorkspaceSymbols;
  describe('basic project', () => {
    const basicFolder = join(__dirname, '/../../../test/fixture/basic');

    beforeEach(() => workspace = new WorkspaceSymbols(`${basicFolder}/tsconfig.json`));

    it('should exist', () => {
      expect(workspace).toBeDefined();
    });

    it('analyse works', () => {
      const modules = workspace.getAllModules();
      expect(modules.length).toBe(1);
      expect(modules[0].name).toBe('AppModule');
      // Scope related API fails because of @angular/core not beeing compiled with Ivy
      // expect(modules[0].isAnalysed).toBeTruthy();
    });
  });
});
