import { WorkspaceSymbols } from '../../lib/ngtsc/workspace-symbols';
import { join } from 'path';
import { getModuleSymbol } from '../../lib/ngtsc/module.symbol';

describe('WorkspaceSymbols', () => {
  let workspace: WorkspaceSymbols;
  describe('basic project', () => {
    const basicFolder = join(__dirname, '/../../../test/fixture/basic');

    beforeEach(() => workspace = new WorkspaceSymbols(`${basicFolder}/tsconfig.json`));

    it('Create module from path', () => {
      const module = getModuleSymbol(workspace, `${basicFolder}/index.ts`);
      expect(module.name).toBe('AppModule');
      expect(module.isAnalysed).toBeFalsy();
    });

    it('analyse one module', () => {
      const module = getModuleSymbol(workspace, `${basicFolder}/index.ts`);
      expect(module.isAnalysed).toBeFalsy();
      module.analyse();
      expect(module.metadata.ref.node.name.getText()).toBe('AppModule');
      // Scope related API fails because of @angular/core not beeing compiled with Ivy
      // expect(module.isAnalysed).toBeTruthy();
    });
  });
});
