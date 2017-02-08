import {NgModule, Component} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'lazy-b-component',
  template: 'LazyB'
})
export class LazyBComponent {}

@NgModule({
  imports: [CommonModule],
  exports: [LazyBComponent],
  declarations: [LazyBComponent],
  bootstrap: [LazyBComponent]
})
export class LazyBModule {}
