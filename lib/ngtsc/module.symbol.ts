import { Declaration, isClassDeclaration, Node } from 'typescript';
import { ClassDeclaration, Decorator } from '@angular/compiler-cli/src/ngtsc/reflection';
import { Trait, TraitState } from '@angular/compiler-cli/src/ngtsc/transform';
import { isNgModuleTrait, hasDecoratorName } from './utils';
import { WorkspaceSymbols } from './workspace-symbols';
import { NgModuleAnalysis } from '@angular/compiler-cli/src/ngtsc/annotations/src/ng_module';

function findNgModule(node: Node) {
  let module: any;
  node.forEachChild(child => {
    if (isClassDeclaration(child) && hasDecoratorName(child, 'NgModule')) {
      module = child;
    }
  });
  return module;
}

export class ModuleSymbol {
  private _trait?: Trait<Decorator, NgModuleAnalysis, unknown>;

  constructor(
    private workspace: WorkspaceSymbols,
    public node: ClassDeclaration<Declaration>,
  ) {}

  get errors() {
    return this.trait?.state === TraitState.ERRORED ? this.trait.diagnostics : null;
  }

  get isAnalysed() {
    return this.trait?.state === TraitState.ANALYZED || this.trait?.state === TraitState.RESOLVED;
  }

  get record() {
    return this.workspace.traitCompiler.recordFor(this.node);
  }

  get metadata() {
    this.ensureAnalysis();
    // getNgModuleMetadata uses only the node from the ref to access metadata
    // see : https://github.com/angular/angular/blob/9.1.x/packages/compiler-cli/src/ngtsc/metadata/src/registry.ts#L19
    const ref = { node: this.node } as any;
    return this.workspace.metaReader.getNgModuleMetadata(ref);
  }

  get scope() {
    this.ensureAnalysis();
    return this.workspace.scopeRegistry.getScopeOfModule(this.node);
  }

  get analysis() {
    this.ensureAnalysis();
    // As we analyzed the node above it should be ok...
    if (this.trait?.state === TraitState.ANALYZED || this.trait?.state === TraitState.RESOLVED) {
      return this.trait.analysis;
    }
  }

  public analyse() {
    this.workspace.traitCompiler.analyzeNode(this.node);
    this.workspace.traitCompiler.resolveNode(this.node);
    // @question should we record NgModule Scope Dependancies here ???
    this._trait = this.record.traits.find(trait => isNgModuleTrait(trait)) as any;
  }

  private get trait() {
    if (!this._trait) {
      this._trait = this.record?.traits.find(trait => isNgModuleTrait(trait)) as any;
    }
    return this._trait;
  }

  private ensureAnalysis() {
    if (!this.record) {
      this.analyse();
    }
  }
}

/** Get the first NgModule found in the file with this path */
export function getModuleSymbol(workspace: WorkspaceSymbols, path: string) {
  const sf = workspace.program.getSourceFile(path);
  const node = findNgModule(sf);
  if (!node) {
    throw new Error('No @NgModule decorated class found for path: ' + path);
  }
  return new ModuleSymbol(workspace, node as ClassDeclaration);
}
