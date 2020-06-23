import { WorkspaceSymbols } from './workspace.symbols';
import { ClassDeclaration, Decorator } from '@angular/compiler-cli/src/ngtsc/reflection';
import { Declaration } from 'typescript';
import { TraitState, Trait } from '@angular/compiler-cli/src/ngtsc/transform';
import { R3DependencyMetadata } from '@angular/compiler';
import { AnnotationNames } from './utils';
import { FactoryOutput } from '.';

const handlerName = {
  'NgModule': 'NgModuleDecoratorHandler',
  'Pipe': 'PipeDecoratorHandler',
  'Injectable': 'InjectableDecoratorHandler',
  'Directive': 'DirectiveDecoratorHandler',
  'Component': 'ComponentDecoratorHandler'
} as const;

const filterByHandler = (annotation: AnnotationNames) => (trait: Trait<Decorator, any, unknown>) => {
  return trait.handler.name === handlerName[annotation];
};


export abstract class Symbol<AnalysisData> {
  protected readonly abstract annotation: AnnotationNames;
  protected readonly abstract deps: R3DependencyMetadata[] | 'invalid' | null;
  private _trait?: Trait<Decorator, AnalysisData, unknown>;

  constructor(
    protected workspace: WorkspaceSymbols,
    public node: ClassDeclaration<Declaration>,
  ) {}

  get name() {
    return this.node.name.getText();
  }

  get errors() {
    return this.trait?.state === TraitState.ERRORED ? this.trait.diagnostics : null;
  }

  get isAnalysed() {
    return this.trait?.state === TraitState.ANALYZED || this.trait?.state === TraitState.RESOLVED;
  }

  get record() {
    return this.workspace.traitCompiler?.recordFor(this.node);
  }

  get analysis() {
    this.ensureAnalysis();
    // As we analyzed the node above it should be ok...
    if (this.trait?.state === TraitState.ANALYZED || this.trait?.state === TraitState.RESOLVED) {
      return this.trait.analysis;
    }
  }

  protected get trait() {
    if (!this._trait) {
      this._trait = this.record?.traits.find(filterByHandler(this.annotation)) as any;
    }
    return this._trait;
  }

  public analyse() {
    this.workspace.traitCompiler?.analyzeNode(this.node);
    this.workspace.traitCompiler?.resolveNode(this.node);
    // @question should we record NgModule Scope Dependancies here ???
    this._trait = this.record?.traits.find(filterByHandler(this.annotation)) as any;
  }


  protected ensureAnalysis() {
    if (!this.record) {
      this.analyse();
    }
  }

  public isSymbol<A extends AnnotationNames>(name: A): this is FactoryOutput<A> {
    return this.annotation === name;
  }
}
