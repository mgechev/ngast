import { CompileProviderMetadata, CompileMetadataResolver, ProviderMeta } from '@angular/compiler';
import { Symbol } from './symbol';
import { Program } from 'typescript';

export class ProviderSymbol extends Symbol {
  constructor(
    program: Program,
    private provider: CompileProviderMetadata,
    private metadataResolver: CompileMetadataResolver
  ) {
    super(program, provider.token.identifier.reference);
  }

  /**
   * Returns the provider metadata.
   */
  getMetadata() {
    return this.provider;
  }

  /**
   * Returns the list of dependencies for given provider.
   */
  getDependencies() {
    return (this.provider.deps || []).map(d => {
      const meta = new ProviderMeta(d.token.identifier.reference, d);
      return new ProviderSymbol(
        this._program,
        this.metadataResolver.getProviderMetadata(meta), this.metadataResolver
      );
    });
  }
}
