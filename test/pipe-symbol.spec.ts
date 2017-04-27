import * as ts from 'typescript';

import {ProjectSymbols} from '../';
import {createProgramFromTsConfig} from './utils/create-program';
import {resourceResolver} from './utils/resource-resolver';

const defaultErrorReporter = (e: any, path: string) => console.error(e, path);

describe('PipeSymbol', () => {
  let program: ts.Program;

  beforeEach(() => {
    program = createProgramFromTsConfig(__dirname + '/../../test/fixture/routing/tsconfig.json');
  });

  it('should provide access to the pipe\'s metadata', () => {
    const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
    const pipe = contextSymbols.getPipes().pop().getMetadata();
    expect(pipe.name).toBe('samplePipe');
    expect(pipe.pure).toBe(false);
  });

  it('should be able to find the ts.Node', () => {
    const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
    const pipe = contextSymbols.getPipes().pop();
    expect(pipe.getNode().name.text).toBe('SamplePipe');
  });

  it('should provide access to the pipe\'s metadata', () => {
    const contextSymbols = new ProjectSymbols(program, resourceResolver, defaultErrorReporter);
    const pipe = contextSymbols.getPipes().pop();
    expect(pipe.getDependencies()[0].getMetadata().token.identifier.reference.name).toBe('Renderer');
  });
});
