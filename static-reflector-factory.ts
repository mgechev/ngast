import * as ts from 'typescript';

import {AngularCompilerOptions, AotCompilerHost, CompilerHost, ModuleResolutionHostAdapter} from '@angular/compiler-cli';

import * as service from '@angular/language-service';

import * as path from 'path';
import * as fs from 'fs';

import {LSHost} from './ls-host';

// import {
//   StaticSymbol,
//   StaticSymbolCache,
//   AotSummaryResolver,
//   StaticReflector,
//   StaticSymbolResolver,
//   createOfflineCompileUrlResolver,
//   AotCompilerHost,
// } from '@angular/compiler';
// import {CompilerHost, ModuleResolutionHostAdapter} from './compiler-host';
// import {PathMappedCompilerHost} from './path-mapped-compiler-host';

interface LanguageServiceEditableHost extends ts.LanguageServiceHost {
  editFile(fileName: string, newContent: string): void;
  fileExists(name: string): boolean;
  readFile(filename: string): string;
}

const createProgram = (configFile: string, projectDirectory?: string): ts.Program => {
  if (projectDirectory === undefined) {
    projectDirectory = path.dirname(configFile);
  }

  const { config } = ts.readConfigFile(configFile, ts.sys.readFile);
  const parseConfigHost: ts.ParseConfigHost = {
    fileExists: fs.existsSync,
    readDirectory: ts.sys.readDirectory,
    readFile: (file) => fs.readFileSync(file, 'utf8'),
    useCaseSensitiveFileNames: true,
  };
  const parsed = ts.parseJsonConfigFileContent(config, parseConfigHost, projectDirectory);
  const host = ts.createCompilerHost(parsed.options, true);
  const program = ts.createProgram(parsed.fileNames, parsed.options, host);

  return program;
};


class ReflectorModuleModuleResolutionHost implements ts.ModuleResolutionHost {
  constructor(private host: ts.LanguageServiceHost) {
    if (host.directoryExists)
      this.directoryExists = directoryName => this.host.directoryExists(directoryName);
  }

  fileExists(fileName: string): boolean { return !!this.host.getScriptSnapshot(fileName); }

  readFile(fileName: string): string {
    let snapshot = this.host.getScriptSnapshot(fileName);
    if (snapshot) {
      return snapshot.getText(0, snapshot.getLength());
    }
    return undefined;
  }

  directoryExists: (directoryName: string) => boolean;
}

export class ReflectorHost extends CompilerHost {
  constructor(
      private getProgram: () => ts.Program, serviceHost: ts.LanguageServiceHost,
      options: AngularCompilerOptions) {
    super(
        null, options,
        new ModuleResolutionHostAdapter(new ReflectorModuleModuleResolutionHost(serviceHost)));
  }

  protected get program() { return this.getProgram(); }
  protected set program(value: ts.Program) {
    // Discard the result set by ancestor constructor
  }
}

const patchTypeScriptServiceHost = (proto: any, configFile: string) => {
  Object.defineProperty(proto, 'reflectorHost', {
    get: function () {
      var result = this._reflectorHost;
      if (!result) {
        if (!this.context) {
          // Make up a context by finding the first script and using that as the base dir.
          this.context = this.host.getScriptFileNames()[0];
        }
        // Use the file context's directory as the base directory.
        // The host's getCurrentDirectory() is not reliable as it is always "" in
        // tsserver. We don't need the exact base directory, just one that contains
        // a source file.
        var source = this.tsService.getProgram().getSourceFile(this.context);
        if (!source) {
            throw new Error('Internal error: no context could be determined');
        }
        var tsConfigPath = configFile;
        var basePath = path.dirname(tsConfigPath || this.context);
        console.log(basePath);
        result = this._reflectorHost = new ReflectorHost(
          () => this.tsService.getProgram(),
          this.host,
          { basePath: basePath, genDir: basePath });
      }
      return result;
    }
  });
};


export const create = (configFile: string) => {

  const program = createProgram(configFile);

  // Includes Angular options as well
  const options = program.getCompilerOptions() as any;
  options.basePath = options.basePath || path.dirname(configFile);

  // Should we remove since we're not interested in codegen
  options.genDir = options.genDir || path.dirname(configFile);

  const files = new Map<string, string>(); // file name -> content
  const fileVersions = new Map<string, number>();
  const host: LanguageServiceEditableHost = {
    getCompilationSettings: () => program.getCompilerOptions(),
    getCurrentDirectory: () => program.getCurrentDirectory(),
    getDefaultLibFileName: () => 'lib.d.ts',
    getScriptFileNames: () => program.getSourceFiles().map((sf) => sf.fileName),
    getScriptSnapshot: (name: string) => {
      const file = files.get(name);
      if (file !== undefined) {
        return ts.ScriptSnapshot.fromString(file);
      }
      if (!program.getSourceFile(name)) {
        return undefined;
      }
      return ts.ScriptSnapshot.fromString(program.getSourceFile(name).getFullText());
    },
    getScriptVersion: (name: string) => {
      const version = fileVersions.get(name);
      return version === undefined ? '1' : String(version);
    },
    log: () => { /* */ },
    editFile(fileName: string, newContent: string) {
      files.set(fileName, newContent);
      const prevVersion = fileVersions.get(fileName);
      fileVersions.set(fileName, prevVersion === undefined ? 0 : prevVersion + 1);
    },
    fileExists(name: string) {
      return fs.existsSync(name);
    },
    readFile(filename: string) {
      return fs.readFileSync(filename).toString();
    }
  };

  let res = service;

  try {
    res = (service as any)();
  } catch (e) {}

  patchTypeScriptServiceHost(res.TypeScriptServiceHost.prototype, configFile);

  const ngHost = new res.TypeScriptServiceHost(host, ts.createLanguageService(host));
  const ngServer = res.createLanguageService(ngHost);
  ngHost.setSite(ngServer);
  return ngHost;

  // const usePathMapping = !!options.rootDirs && options.rootDirs.length > 0;
  // const context = new ModuleResolutionHostAdapter(host);
  // const ngCompilerHost = usePathMapping ? new PathMappedCompilerHost(program, options, context) :
  //                                   new CompilerHost(program, options, context);
  // let translations: string = options.translations || '';
  // const urlResolver = createOfflineCompileUrlResolver();
  // const symbolCache = new StaticSymbolCache();
  // const summaryResolver = new AotSummaryResolver(ngCompilerHost, symbolCache);
  // const symbolResolver = new StaticSymbolResolver(ngCompilerHost, symbolCache, summaryResolver);
  // return new StaticReflector(symbolResolver);
};
