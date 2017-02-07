import {ProjectSymbols} from './project-symbols';
import {createProgram} from './create-program';
import * as fs from 'fs';

// const configFilePath = '/Users/mgechev/Projects/angular-seed/src/client/tsconfig.json';
const configFilePath = '/Users/mgechev/Projects/angular-seed/src/client/tsconfig.json';

const resolver = {
  resolveSync(url: string) {
    return fs.readFileSync(url).toString();
  },
  resolveAsync(url: string) {
    return new Promise((resolve, reject) => {
      fs.readFile(url, 'utf-8', (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
};

// console.log((new ProjectSymbols(createProgram(configFilePath)).getDirectives().pop().annotation as any).styleUrls);
// console.log(new ProjectSymbols(createProgram(configFilePath)).getPipes());
// console.log(new ProjectSymbols(createProgram(configFilePath)).getDirectives().pop().metadata);
const ps = new ProjectSymbols(createProgram(configFilePath), resolver);

console.log(ps.getDirectives().pop().getMetadata());
// ps.getModules();
// console.log(ps.getModules().filter(m => m.metadata.type.reference.name === 'AppModule'));
// console.log(ps.getTemplateAst(ps.getDirectives().map(m => m.metadata.metadata.type).pop().reference));
// console.log(ps.getPipes());
// console.log(ps.pipeResolver.resolve((ps.getPipes().pop() as any)));
// console.log(ps.metadataResolver.getPipeSummary(ps.getPipes().pop()));
// console.log(m);
// ps.metadataResolver.loadNgModuleDirectiveAndPipeMetadata(m.metadata.type.reference, false)
// .then(() => {
//   console.log(ps.metadataResolver.getNonNormalizedDirectiveMetadata(m.metadata.declaredDirectives[0].reference));
// })
// .catch(e => {
//   console.log(e);
// });
// const dir = .metadata.bootstrapComponents.pop();
// console.log(ps.metadataResolver.getNonNormalizedDirectiveMetadata(dir.reference));
// // console.log(ps.metadataResolver.getNonNormalizedDirectiveMetadata(dir));
// // console.log(directive.metadata);
// console.log('-----------');
// // console.log(ps.staticSymbolResolver.resolveSymbol(directive.metadata.selector as any));
// // console.log((a.reflector as any).simplify(directive.v, ));

