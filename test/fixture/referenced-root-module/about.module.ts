import {NgModule, Component} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'main-component',
  template: '<div *ngIf="visible">Hello world</div>'
})
export class AboutComponent {
  visible: boolean;
}

@NgModule({
  imports: [CommonModule],
  exports: [AboutComponent],
  declarations: [AboutComponent]
})
export class AboutModule {}
