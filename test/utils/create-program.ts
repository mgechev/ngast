import * as ts from 'typescript';
import {dirname} from 'path';

export const normalizeOptions = (options: any, configFilePath: string) => {
  options.genDir = options.basePath = options.baseUrl;
  options.configFilePath = configFilePath;
};

export type File = string;
export type Path = string;
export type Project = Map<Path, File>;

class Host implements ts.CompilerHost {
  private currentDir = '';

  constructor(private project: Project, private options: ts.CompilerOptions) {}

  useCaseSensitiveFileNames() {
    return true;
  }

  getNewLine() {
    return '\n';
  }

  getSourceFile(filename: string, version: ts.ScriptTarget) {
    return ts.createSourceFile(filename, this.project.get(filename), version);
  }

  readFile(filename: string) {
    return this.project.get(filename);
  }

  fileExists(filename: string) {
    return this.project.has(filename);
  }

  getDefaultLibFileName() {
    return 'lib.d.ts';
  }

  getCompilationSettings() {
    return this.options;
  }

  getCurrentDirectory() {
    return this.currentDir;
  }

  getScriptFileNames() {
    const iter = this.project.keys();
    const result = [];
    for (let file of iter) {
      result.push(file);
    }
    return result;
  }

  writeFile(file: string, content: string) {
    this.project.set(file, content);
  }

  getScriptSnapshot(name: string) {
    const content = this.readFile(name);
    return ts.ScriptSnapshot.fromString(content);
  }

  getDirectories() {
    const res = this.getScriptFileNames().map(f => dirname(f));
    return res.filter((f, idx) => res.indexOf(f) === idx);
  }

  getCanonicalFileName(name: string) {
    return name;
  }
}

export const createProgram = (project: Project, config: any, root: ''): ts.Program => {
  const filenames = [];
  project.forEach((path, content) => filenames.push(path));
  const parseConfigHost: ts.ParseConfigHost = {
    fileExists: (path: string) => {
      return true;
    },
    readDirectory: (dir: string) => {
      return filenames.filter(f => {
        return dirname(f.path) === dir;
      }).map(f => f.path);
    },
    useCaseSensitiveFileNames: true,
  };
  const parsed = ts.parseJsonConfigFileContent(config, parseConfigHost, root);
  parsed.options.baseUrl = parsed.options.baseUrl || root;
  normalizeOptions(parsed.options, root);
  const host = ts.createCompilerHost(parsed.options, true);
  const program = ts.createProgram(filenames, parsed.options, host);

  return program;
};
