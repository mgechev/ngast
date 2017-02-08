import * as ts from 'typescript';
import {dirname} from 'path';

export type File = string;
export type Path = string;
export type Project = {[key: string]: string};

export class CompilerHost implements ts.CompilerHost {
  private currentDir = '';

  constructor(private project: Project, private options: ts.CompilerOptions) {}

  useCaseSensitiveFileNames() {
    return true;
  }

  getNewLine() {
    return '\n';
  }

  getSourceFile(filename: string, version: ts.ScriptTarget) {
    let content = this.project[filename];
    if (filename === this.getDefaultLibFileName()) {
      content = '';
    }
    return ts.createSourceFile(filename, content, version);
  }

  readFile(filename: string) {
    return this.project[filename];
  }

  fileExists(filename: string) {
    return !!this.project[filename];
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
    const iter = Object.keys(this.project);
    const result = [];
    for (let file of iter) {
      result.push(file);
    }
    return result;
  }

  writeFile(file: string, content: string) {
    this.project[file] = content;
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
