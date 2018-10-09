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
import { ProjectSymbols } from './project-symbols';
import { Symbol } from './symbol';
import { DirectiveSymbol } from './directive-symbol';
import { PipeSymbol } from './pipe-symbol';
import { CompileNgModuleSummary } from '@angular/compiler';
import { ProviderSymbol } from './provider-symbol';

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
    private projectSymbols: ProjectSymbols
  ) {
    super(program, symbol);
    const meta = this.metadataResolver.getNgModuleMetadata(symbol);
    if (meta) {
      this.module = meta;
    } else {
      throw new Error('No metadata for ' + symbol.name);
    }
  }

  getBootstrapComponents() {
    return this.getWrapperDirectives(this.module.bootstrapComponents);
  }

  getDeclaredDirectives() {
    return this.getWrapperDirectives(this.module.declaredDirectives);
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

  /**
   * Returns the summary of this context.
   *
   * @returns {(CompileNgModuleSummary | undefined)}
   *
   * @memberOf ModuleSymbol
   */
  getModuleSummary(): CompileNgModuleSummary | null {
    return this.metadataResolver.getNgModuleSummary(this.symbol);
  }

  getProviders() {
    return this.module.providers.map(p => {
      return new ProviderSymbol(this._program, p, this.metadataResolver);
    });
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
      return new PipeSymbol(this._program, i.reference, this.pipeResolver, this.metadataResolver, this.projectSymbols);
    });
  }

  private getWrapperDirectives(dirs: CompileIdentifierMetadata[]) {
    return dirs.map(i => {
      return new DirectiveSymbol(
        this._program,
        i.reference,
        this.metadataResolver,
        this.directiveNormalizer,
        this.reflector,
        this.resourceResolver,
        this.projectSymbols
      );
    });
  }
}
