import {ResourceLoader} from '@angular/compiler';

export interface ResourceResolver extends ResourceLoader {
  get(url: any): Promise<string>;
  getSync(url: string): string;
}
