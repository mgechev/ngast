import { CompileProviderMetadata, CompileMetadataResolver, ProviderMeta } from '@angular/compiler';
import { Program } from 'typescript';

export class ProviderSymbol {
  constructor(
    private program: Program,
    private provider: CompileProviderMetadata,
    private metadataResolver: CompileMetadataResolver
  ) {}

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
        this.program,
        this.metadataResolver.getProviderMetadata(meta), this.metadataResolver
      );
    });
  }
}
