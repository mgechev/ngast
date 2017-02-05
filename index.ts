import {ProjectSymbols} from './project-symbols';

const configFilePath = '/Users/mgechev/Projects/ngresizable/tsconfig.json';
console.log((new ProjectSymbols(configFilePath).getDirectives().pop().annotation as any).styleUrls);
