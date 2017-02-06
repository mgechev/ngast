import {ProjectSymbols} from './project-symbols';
import {createProgram} from './create-program';

const configFilePath = '/Users/mgechev/Projects/ngresizable/tsconfig.json';

// console.log((new ProjectSymbols(createProgram(configFilePath)).getDirectives().pop().annotation as any).styleUrls);
// console.log(new ProjectSymbols(createProgram(configFilePath)).getPipes());
// console.log(new ProjectSymbols(createProgram(configFilePath)).getDirectives().pop().metadata);
const ps = new ProjectSymbols(createProgram(configFilePath));
const directive = ps.getDirectives().pop();
// console.log(directive.metadata);
console.log('-----------');
console.log(ps.staticSymbolResolver.resolveSymbol(directive.metadata.selector as any));
// console.log((a.reflector as any).simplify(directive.v, ));

