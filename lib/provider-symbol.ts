import { CompileProviderMetadata, CompileMetadataResolver, ProviderMeta } from '@angular/compiler';
import { Symbol } from './symbol';
import { Program } from 'typescript';

export class ProviderSymbol extends Symbol {
  constructor(
    program: Program,
    private provider: CompileProviderMetadata,
    private metadataResovler: CompileMetadataResolver
  ) {
    super(program, provider.token.identifier.reference);
  }

  getMetadata() {
    return this.provider;
  }

  getDependencies() {
    return this.provider.deps.map(d => {
      const meta = new ProviderMeta(
        d.token,
        d
      );
      return new ProviderSymbol(
        this._program,
        this.metadataResovler.getProviderMetadata(meta), this.metadataResovler
      );
    });
  }
}
