import {create} from './static-reflector-factory';
import * as ts from 'typescript';

const service = create('../angular-seed/tsconfig.json');

console.log((service as any).getTemplates('../angular-seed/src/client/app/app.component.ts'));
