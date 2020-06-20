import { Declaration } from 'typescript';
import { ClassDeclaration, Decorator } from '@angular/compiler-cli/src/ngtsc/reflection';
import { Trait, TraitState } from '@angular/compiler-cli/src/ngtsc/transform';
import { Reference } from '@angular/compiler-cli/src/ngtsc/imports';
import { isNgModuleTrait } from './utils';
import { WorkspaceSymbols } from './workspace-symbols';
import { NgModuleAnalysis } from '@angular/compiler-cli/src/ngtsc/annotations/src/ng_module';

export class ModuleSymbol {
  private ref: Reference<ClassDeclaration<Declaration>>;
  private _trait?: Trait<Decorator, NgModuleAnalysis, unknown>;

  static fromPath(
    workspace: WorkspaceSymbols,
    path: string
  ) {
    const sf = workspace.program.getSourceFile(path);
    // check for NgModule node
    // return new ModuleSymbol(workspace, node);
  }

  constructor(
    private workspace: WorkspaceSymbols,
    private node: ClassDeclaration<Declaration>,
  ) {}

  private ensureAnalysis() {
    if (!this.record) {
      this.workspace.traitCompiler.analyzeNode(this.node);
      // @question: Should I run scopeRegistry.getCompilationScopes() here ???
      this._trait = this.record.traits.find(trait => isNgModuleTrait(trait)) as any;
    }
  }

  private get trait() {
    if (!this._trait) {
      this._trait = this.record.traits.find(trait => isNgModuleTrait(trait)) as any;
    }
    return this._trait;
  }

  get isAnalysed() {
    return this.trait?.state === TraitState.ANALYZED || this.trait?.state === TraitState.RESOLVED;
  }

  get record() {
    return this.workspace.traitCompiler.recordFor(this.node);
  }

  get metadata() {
    this.ensureAnalysis();
    return this.workspace.metaReader.getNgModuleMetadata(this.ref);
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

}
