import { ChangeDetectionStrategy } from '@angular/core';

export interface DirectiveMetadata {
  exportAs: string[] | null;
  selector: string | null;
  inputs: {[field: string]: string | [string, string]};
  outputs: {[field: string]: string};
}

export interface ComponentMetadata extends DirectiveMetadata {
  changeDetection: ChangeDetectionStrategy | undefined;
}
