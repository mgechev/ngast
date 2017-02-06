import {ProjectSymbols} from './project-symbols';
import {createProgram} from './create-program';

const configFilePath = '/Users/mgechev/Projects/angular-seed/src/client/tsconfig.json';

// console.log((new ProjectSymbols(createProgram(configFilePath)).getDirectives().pop().annotation as any).styleUrls);
// console.log(new ProjectSymbols(createProgram(configFilePath)).getPipes());
// console.log(new ProjectSymbols(createProgram(configFilePath)).getDirectives().pop().metadata);
const ps = new ProjectSymbols(createProgram(configFilePath));
// ps.getModules();
// console.log(ps.getModules().filter(m => m.metadata.type.reference.name === 'AppModule'));
const m = ps.getModules().pop();
console.log(m);
ps.metadataResolver.loadNgModuleDirectiveAndPipeMetadata(m.metadata.type.reference, false)
.then(() => {
  console.log(m.metadata.declaredDirectives);
})
.catch(e => {
  console.log(e);
});
// const dir = .metadata.bootstrapComponents.pop();
// console.log(ps.metadataResolver.getNonNormalizedDirectiveMetadata(dir.reference));
// // console.log(ps.metadataResolver.getNonNormalizedDirectiveMetadata(dir));
// // console.log(directive.metadata);
// console.log('-----------');
// // console.log(ps.staticSymbolResolver.resolveSymbol(directive.metadata.selector as any));
// // console.log((a.reflector as any).simplify(directive.v, ));

