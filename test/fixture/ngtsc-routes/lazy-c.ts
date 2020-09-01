import {NgModule, Component} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'lazy-a-component',
  template: 'LazyC'
})
export class LazyCComponent {}

@NgModule({
  imports: [CommonModule],
  exports: [LazyCComponent],
  declarations: [LazyCComponent],
  bootstrap: [LazyCComponent]
})
export class LazyCModule {}
