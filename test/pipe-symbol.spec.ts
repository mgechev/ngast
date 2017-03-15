import * as ts from 'typescript';

import {ContextSymbols} from '../';
import {createProgramFromTsConfig} from './utils/create-program';
import {resourceResolver} from './utils/resource-resolver';

describe('DirectiveSymbol', () => {
  let program: ts.Program;

  beforeEach(() => {
    program = createProgramFromTsConfig(__dirname + '/../../test/fixture/routing/tsconfig.json');
  });

  it('should provide access to the directive\'s metadata', () => {
    const contextSymbols = new ContextSymbols(program, resourceResolver);
    const pipe = contextSymbols.getPipes().pop().getMetadata();
    expect(pipe.name).toBe('samplePipe');
    expect(pipe.pure).toBe(false);
  });

  it('should be able to find the ts.Node', () => {
    const contextSymbols = new ContextSymbols(program, resourceResolver);
    const pipe = contextSymbols.getPipes().pop();
    expect(pipe.getNode().name.text).toBe('SamplePipe');
  });

  it('should provide access to the directive\'s metadata', () => {
    const contextSymbols = new ContextSymbols(program, resourceResolver);
    const pipe = contextSymbols.getPipes().pop();
    expect(pipe.getDependencies()[0].symbol.name).toBe('Renderer');
  });
});
