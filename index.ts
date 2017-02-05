import * as ts from 'typescript';

import * as fs from 'fs';
import * as path from 'path';

import {ViewEncapsulation, NO_ERRORS_SCHEMA} from '@angular/core';
import {
  CompileMetadataResolver,
  NgModuleResolver,
  DirectiveResolver,
  DirectiveNormalizer,
  ResourceLoader,
  UrlResolver,
  HtmlParser,
  CompilerConfig,
  PipeResolver,
  AotSummaryResolver,
  DomElementSchemaRegistry,
  analyzeAndValidateNgModules,
  extractProgramSymbols,
  StaticSymbolResolver,
  StaticSymbolResolverHost,
  StaticSymbolCache,
  StaticSymbol,
  StaticReflector,
  SummaryResolver,
  createOfflineCompileUrlResolver
} from '@angular/compiler';

import {
  CompilerHost,
  AngularCompilerOptions,
  CompilerHostContext,
  ModuleMetadata,
  NodeCompilerHostContext
} from '@angular/compiler-cli';

export class DummyResourceLoader extends ResourceLoader {
  get(url: string): Promise<string> { return Promise.resolve(''); }
}


const create = (program: ts.Program, options: AngularCompilerOptions) => {

  const staticSymbolCache = new StaticSymbolCache();

  const summaryResolver = new AotSummaryResolver({
    loadSummary(filePath: string) { return null; },
    isSourceFile(sourceFilePath: string) { return true; },
  }, staticSymbolCache);

  const parser = new HtmlParser();
  const config = new CompilerConfig({
    genDebugInfo: false,
    defaultEncapsulation: ViewEncapsulation.Emulated,
    logBindingUpdate: false,
    useJit: false
  });

  const normalizer = new DirectiveNormalizer(new DummyResourceLoader(), createOfflineCompileUrlResolver(), parser, config);

  const staticResolverHost = new CompilerHost(program, options, new NodeCompilerHostContext());

  // const staticSymbolResolver = new StaticSymbolResolver(
  //   staticResolverHost,
  //   staticSymbolCache,
  //   new SummaryResolver<StaticSymbol>()
  // );

  const staticSymbolResolver = new StaticSymbolResolver(
          staticResolverHost, staticSymbolCache, summaryResolver,
          (e, filePath) => {
            console.log(e, filePath);
          });

  const reflector = new StaticReflector(
        staticSymbolResolver, [], [], (e, filePath) => {
            console.log(e, filePath);
          });

  const ngModuleResolver = new NgModuleResolver(reflector);
  const dirResolver = new DirectiveResolver(reflector);
  const pipeResolver = new PipeResolver(reflector);

  const directiveNormalizer = new DirectiveNormalizer(new DummyResourceLoader(), new UrlResolver(), parser, config);

  const resolver = new CompileMetadataResolver(
          ngModuleResolver, dirResolver, pipeResolver, new SummaryResolver(),
          new DomElementSchemaRegistry(), directiveNormalizer, reflector);

  return { staticSymbolResolver, resolver };
};

const exists = file => {
  try {
    fs.statSync(file);
    return true;
  } catch (e) {
    return false;
  }
};


const createProgram = (configFile: string, projectDirectory?: string): { program: ts.Program, options: any } => {
  if (projectDirectory === undefined) {
    projectDirectory = path.dirname(configFile);
  }

  const { config } = ts.readConfigFile(configFile, ts.sys.readFile);
  const parseConfigHost: ts.ParseConfigHost = {
    fileExists: exists,
    readDirectory: ts.sys.readDirectory,
    readFile: (file) => fs.readFileSync(file, 'utf8'),
    useCaseSensitiveFileNames: true,
  };
  const parsed = ts.parseJsonConfigFileContent(config, parseConfigHost, projectDirectory);
  parsed.options.baseUrl = parsed.options.baseUrl || projectDirectory;
  const host = ts.createCompilerHost(parsed.options, true);
  const program = ts.createProgram(parsed.fileNames, parsed.options, host);

  return { program, options: parsed.options };
};

const configFilePath = '/Users/mgechev/Projects/ngresizable/tsconfig.json';
const res = createProgram(configFilePath);

res.options.genDir = res.options.basePath = res.options.baseUrl;
res.options.configFilePath = configFilePath;

const {staticSymbolResolver, resolver} = create(res.program, res.options);

const analyzeHost = { isSourceFile(filePath: string) { return true; }};

const dir = staticSymbolResolver.getStaticSymbol(
  '/Users/mgechev/Projects/ngresizable/lib/ngresizable.component.ts',
  'NgResizableComponent'
);
const mod = staticSymbolResolver.getStaticSymbol(
  '/Users/mgechev/Projects/ngresizable/lib/ngresizable.module.ts',
  'NgResizableModule'
);

resolver.loadNgModuleDirectiveAndPipeMetadata(mod, false)
  .then(() => {
    console.log(resolver.isDirective(dir));
  })
  .catch(e => {
    console.log(e);
  });


// const programSymbols = extractProgramSymbols(
//     symbolResolver, res.program.getSourceFiles().map(sf => sf.fileName),
//     analyzeHost);

// console.log(programSymbols);
