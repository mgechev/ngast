import { CssParser } from './css-parser';
export const parseCss = (text) => {
    const parser = new CssParser();
    return parser.parse(text, '').ast;
};
//# sourceMappingURL=parse-css.js.map