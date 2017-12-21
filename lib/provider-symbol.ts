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
      let token = d.token;
      if (d.token) {
        if (d.token.identifier) {
          token = d.token.identifier.reference;
        }
      }
      const meta = new ProviderMeta(token, { useClass: d.value });
      return new ProviderSymbol(this.program, this.metadataResolver.getProviderMetadata(meta), this.metadataResolver);
    });
  }
}
