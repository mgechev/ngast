import * as ts from 'typescript';
import {Symbol} from '../lib/symbol';
import {createProgram} from './utils/create-program';

describe('Symbol', () => {
  it('should return the source node', () => {
    createProgram({
      'asd': 'asd'
    }, {}, '')
  });
});
