import {CssParser} from './css-parser';
import {CssAst} from './css-ast';

export const parseCss = (text: string): CssAst => {
  const parser = new CssParser();
  return parser.parse(text, '').ast;
};
