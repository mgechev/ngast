import { ProjectSymbols } from '../../lib/ngcc';
import { resourceResolver } from '../utils/resource-resolver';
import { getConfig } from './get-tsconfig';

const defaultErrorReporter = (e: any, path: string) => console.error(e, path);

describe('DirectiveSymbol', () => {
  describe('inline metadata', () => {
    let program: string;

    beforeEach(() => {
      program = getConfig('deps');
    });

    it(`should parse dependencies`, () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
      const provider = contextSymbols.getProviders().pop();
    });
  });
});
