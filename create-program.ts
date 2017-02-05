import * as ts from 'typescript';
import {readFileSync, existsSync} from 'fs';
import {dirname} from 'path';

export const normalizeOptions = (options: any, configFilePath: string) => {
  options.genDir = options.basePath = options.baseUrl;
  options.configFilePath = configFilePath;
};

export const createProgram = (configFile: string): ts.Program => {
  const projectDirectory = dirname(configFile);
  const { config } = ts.readConfigFile(configFile, ts.sys.readFile);

  const parseConfigHost: ts.ParseConfigHost = {
    fileExists: existsSync,
    readDirectory: ts.sys.readDirectory,
    readFile: (file) => readFileSync(file, 'utf8'),
    useCaseSensitiveFileNames: true,
  };
  const parsed = ts.parseJsonConfigFileContent(config, parseConfigHost, projectDirectory);
  parsed.options.baseUrl = parsed.options.baseUrl || projectDirectory;
  normalizeOptions(parsed.options, configFile);
  const host = ts.createCompilerHost(parsed.options, true);
  const program = ts.createProgram(parsed.fileNames, parsed.options, host);

  return program;
};
