[![Build Status](https://travis-ci.org/mgechev/ngast.svg?branch=master)](https://travis-ci.org/mgechev/ngast)

# ngast

This library provides user friendly API for parsing Angular projects.

# Getting started
```
$ npm i @angular/core @angular/compiler @angular/compiler-cli ngast --save
```

> `ngast` is built on top of Ivy (`ngtsc`), make sure to compile your project with `ngcc` (run `ng serve`, `ng build` or `npx ngcc`).

## Workspace
First you need connect the `WorkspaceSymbols` to the `tsconfig.json` root : 
```typescript
import { join } from 'path';
import { WorkspaceSymbols } from 'ngast';

const config = join(process.cwd(), 'tsconfig.json');
const workspace = new WorkspaceSymbols(config);
```

From there you can find all the decorated classes in your project : 
```typescript
const modules = workspace.getAllModules();
const components = workspace.getAllComponents();
const directives = workspace.getAllDirectives();
const injectables = workspace.getAllInjectable();
const pipes = workspace.getAllPipes();
```

The **first time** one of the method above is called, `ngast` will run the analysis of the workspace.

The analysis is currently quite long: **>10sec for a small project** can go **beyond 2min for a very large project**.


# Working without Ivy
Version 0.4.0 is built on top of the ViewEngine, you can take a look at the [documentation here](https://ng-ast.github.io/ngast/).

# Example

Projects using ngast:

- [ngrev](https://github.com/mgechev/ngrev) - Tool for reverse engineering of Angular applications.
- [codelyzer](https://github.com/mgechev/codelyzer) - Static code analysis for Angular projects.
- [ngworld](https://github.com/mgechev/ngworld) - Visualization of Angular projects.
- [ng-app-counter](https://github.com/irustm/ng-app-counter) - Counter for Angular applications.
- [ng-pathfinder](https://github.com/vakrilov/ng-pathfinder) - Show a list of all routes in an angular application.
- [ngx-translate-all](https://github.com/irustm/ngx-translate-all) - Tool for automate i18n Angular projects.
- [ngx-translate-migrate](https://github.com/irustm/ngx-translate-migrate) - Tool for migrate from ngx-translate to Angular i18n.

# License

MIT

