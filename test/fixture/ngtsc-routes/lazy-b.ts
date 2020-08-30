import {NgModule, Component} from '@angular/core';
import {CommonModule} from '@angular/common';

import {RouterModule} from '@angular/router';

@Component({
  selector: 'lazy-b-component',
  template: 'LazyB'
})
export class LazyBComponent {}

const routes = RouterModule.forChild([
  {
    path: 'lazy-c',
    loadChildren: () => import('./lazy-c').then(m => m.LazyCModule)
  }
]);

@NgModule({
  imports: [CommonModule, routes],
  exports: [LazyBComponent],
  declarations: [LazyBComponent],
  bootstrap: [LazyBComponent]
})
export class LazyBModule {}
