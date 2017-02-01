import {create} from './static-reflector-factory';
import * as ts from 'typescript';

const { service, host } = create('../ngresizable/tsconfig.json');



// console.log(service.getAnalyzedModules());
// (service.ls as any).getTemplate
const file = '../ngresizable/lib/ngresizable.component.ts';

const templates = (host as any).getTemplates(file);
(host as any).clearCaches();
// host.updateAnalyzedModules
//console.log(templates);
console.log((service as any).getTemplateAst(templates[0], file));

