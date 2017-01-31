import * as ts from 'typescript';

import {ModuleMetadata, MetadataCollector, AngularCompilerOptions} from '@angular/tsc-wrapped';
import * as path from 'path';
import * as fs from 'fs';
import {
  StaticSymbol,
  StaticSymbolCache,
  AotSummaryResolver,
  StaticReflector,
  StaticSymbolResolver,
  createOfflineCompileUrlResolver,
  AotCompilerHost,
} from '@angular/compiler';
import {CompilerHost, ModuleResolutionHostAdapter} from './compiler-host';
import {PathMappedCompilerHost} from './path-mapped-compiler-host';

interface LanguageServiceEditableHost extends ts.LanguageServiceHost {
  editFile(fileName: string, newContent: string): void;
  fileExists(name: string): boolean;
  readFile(filename: string): string;
}

export const create = (program: ts.Program) => {

  // Includes Angular options as well
  const options = program.getCompilerOptions() as any;

  const files = new Map<string, string>(); // file name -> content
  const fileVersions = new Map<string, number>();
  const host: LanguageServiceEditableHost = {
    getCompilationSettings: () => program.getCompilerOptions(),
    getCurrentDirectory: () => program.getCurrentDirectory(),
    getDefaultLibFileName: () => "lib.d.ts",
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
      return version === undefined ? "1" : String(version);
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

  const usePathMapping = !!options.rootDirs && options.rootDirs.length > 0;
  const context = new ModuleResolutionHostAdapter(host);
  const ngCompilerHost = usePathMapping ? new PathMappedCompilerHost(program, options, context) :
                                    new CompilerHost(program, options, context);
  let translations: string = options.translations || '';
  const urlResolver = createOfflineCompileUrlResolver();
  const symbolCache = new StaticSymbolCache();
  const summaryResolver = new AotSummaryResolver(ngCompilerHost, symbolCache);
  const symbolResolver = new StaticSymbolResolver(ngCompilerHost, symbolCache, summaryResolver);
  return new StaticReflector(symbolResolver);
};
