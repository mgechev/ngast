import { ProjectSymbols } from '../';
import { resourceResolver } from './utils/resource-resolver';

const defaultErrorReporter = (e: any, path: string) => console.error(e, path);

describe('DirectiveSymbol', () => {
  describe('inline metadata', () => {
    let program: string;

    beforeEach(() => {
      program = __dirname + '/../../test/fixture/deps/tsconfig.json';
    });

    it(`should parse dependencies`, () => {
      const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
      const provider = contextSymbols.getProviders().pop();
    });
  });
});
