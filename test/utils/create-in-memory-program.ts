import * as ts from 'typescript';
import {Project, CompilerHost} from './host';
import {dirname} from 'path';

export const normalizeOptions = (options: any, configFilePath: string) => {
  options.genDir = options.basePath = options.baseUrl;
  options.configFilePath = configFilePath;
};

export const createProgram = (project: Project, config: any, root: string = ''): ts.Program => {
  const filenames = Object.keys(project);

  // Any because of different APIs in TypeScript 2.1 and 2.0
  const parseConfigHost: any = {
    fileExists: (path: string) => true,
    readFile: (file) => null,
    readDirectory: (dir: string) => filenames.filter(f => dirname(f) === dir),
    useCaseSensitiveFileNames: true,
  };
  const parsed = ts.parseJsonConfigFileContent(config, parseConfigHost, root);
  parsed.options.baseUrl = parsed.options.baseUrl || root;
  normalizeOptions(parsed.options, root);
  const host = new CompilerHost(project, parsed.options);
  const program = ts.createProgram(filenames, parsed.options, host);
  return program;
};
