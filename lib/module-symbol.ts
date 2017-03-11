import { Program } from 'typescript';
import {
  CompileMetadataResolver,
  DirectiveNormalizer,
  DirectiveResolver,
  StaticReflector,
  CompileIdentifierMetadata
} from '@angular/compiler';
import { ResourceResolver } from './resource-resolver';
import { ContextSymbols } from './context-symbols';
import { Symbol } from './symbol';
import { DirectiveSymbol } from './directive-symbol';
import { CompileNgModuleMetadata, PipeResolver } from '@angular/compiler';
import { PipeSymbol } from './pipe-symbol';

export class ModuleSymbol extends Symbol {
  constructor(
    program: Program,
    private module: CompileNgModuleMetadata,
    private metadataResolver: CompileMetadataResolver,
    private directiveNormalizer: DirectiveNormalizer,
    private resolver: DirectiveResolver,
    private pipeResolver: PipeResolver,
    private reflector: StaticReflector,
    private resourceResolver: ResourceResolver,
    private projectSymbols: ContextSymbols) {
      super(program, module.type.reference);
    }

  getBootstrapComponents() {
    return this.getWrapperDirectives(this.module.bootstrapComponents);
  }

  getDeclaredDirectives() {
    return this.getWrapperDirectives(this.module.exportedDirectives);
  }

  getExportedDirectives() {
    return this.getWrapperDirectives(this.module.exportedDirectives);
  }

  getExportedPipes() {
    return this.getWrappedPipes(this.module.exportedPipes);
  }

  getDeclaredPipes() {
    return this.getWrappedPipes(this.module.declaredPipes);
  }

  private getWrappedPipes(pipes: CompileIdentifierMetadata[]) {
    return pipes.map(i => {
      return new PipeSymbol(
        this._program,
        i.reference,
        this.pipeResolver,
        this.projectSymbols
      );
    });
  }

  private getWrapperDirectives(dirs: CompileIdentifierMetadata[]) {
    return dirs.map(i => {
      return new DirectiveSymbol(
        this._program,
        i.reference,
        this.metadataResolver,
        this.directiveNormalizer,
        this.resolver,
        this.reflector,
        this.resourceResolver,
        this.projectSymbols
      );
    });
  }
}
