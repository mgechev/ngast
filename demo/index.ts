import {ProjectSymbols} from '../index';
import {DirectiveSymbol} from '../index';
import {PipeSymbol} from '../index';
import {Symbol} from '../index';
import {ResourceResolver} from '../index';
import {createProgramFromTsConfig} from './create-program';

import * as fs from 'fs';


const tsconfig = '/Users/mgechev/Projects/angular-seed/src/client/tsconfig.json';
const program = createProgramFromTsConfig(tsconfig);

const project = new ProjectSymbols(program, {
  resolveAsync(url: string) {
    return new Promise((resolve, reject) => {
      fs.readFile(url, 'utf-8', (err, content) => {
        if (err) {
          reject(err);
        } else {
          resolve(content);
        }
      });
    });
  },
  resolveSync(url: string) {
    return fs.readFileSync(url).toString();
  }
});

console.time();
console.log(project.getProjectSummary());
console.timeEnd();

console.time();
console.log(project.getDirectives().filter(d => d.getNode().name.text === 'NavbarComponent').pop().getResolvedMetadata());
console.timeEnd();

console.time();
console.log(project.getDirectives().filter(d => d.getNode().name.text === 'NavbarComponent').pop().getResolvedMetadata());
console.timeEnd();
