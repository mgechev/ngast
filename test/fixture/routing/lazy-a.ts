import {NgModule, Component} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'lazy-a-component',
  template: 'LazyA'
})
export class LazyAComponent {}

@NgModule({
  imports: [CommonModule],
  exports: [LazyAComponent],
  declarations: [LazyAComponent],
  bootstrap: [LazyAComponent]
})
export class LazyAModule {}
