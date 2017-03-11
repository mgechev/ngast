import { Program } from 'typescript';
import {
  CompileMetadataResolver,
  DirectiveNormalizer,
  DirectiveResolver,
  StaticReflector,
  CompileIdentifierMetadata,
  CompileNgModuleMetadata,
  StaticSymbol,
  PipeResolver
} from '@angular/compiler';
import { ResourceResolver } from './resource-resolver';
import { ContextSymbols } from './context-symbols';
import { Symbol } from './symbol';
import { DirectiveSymbol } from './directive-symbol';
import { PipeSymbol } from './pipe-symbol';
import { CompileNgModuleSummary } from '@angular/compiler';

export class ModuleSymbol extends Symbol {
  private module: CompileNgModuleMetadata;

  constructor(
    program: Program,
    symbol: StaticSymbol,
    private metadataResolver: CompileMetadataResolver,
    private directiveNormalizer: DirectiveNormalizer,
    private resolver: DirectiveResolver,
    private pipeResolver: PipeResolver,
    private reflector: StaticReflector,
    private resourceResolver: ResourceResolver,
    private projectSymbols: ContextSymbols) {
      super(program, symbol);
      this.module = this.metadataResolver.getNgModuleMetadata(symbol);
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

  getImportedModules() {
    return this.getWrappedModules(this.module.importedModules);
  }

  getExportedModules() {
    return this.getWrappedModules(this.module.exportedModules);
  }

  private getWrappedModules(modules: CompileNgModuleSummary[]) {
    return modules.map(s => {
      return new ModuleSymbol(
        this._program,
        s.type.reference,
        this.metadataResolver,
        this.directiveNormalizer,
        this.resolver,
        this.pipeResolver,
        this.reflector,
        this.resourceResolver,
        this.projectSymbols
      );
    });
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
