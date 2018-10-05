import { NgModule, Component, Inject } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

export class BasicProvider {}

@Component({
  selector: 'main-component',
  template: '<div *ngIf="visible">Hello world</div>'
})
export class MainComponent {
  visible: boolean;
}

export class CompositeProvider {
  constructor(public p: BasicProvider, @Inject('primitive') public primitive: string) {}
}

@NgModule({
  imports: [CommonModule, BrowserModule],
  exports: [MainComponent],
  declarations: [MainComponent],
  bootstrap: [MainComponent],
  providers: [CompositeProvider, BasicProvider, { provide: 'primitive', useValue: '42' }]
})
export class AppModule {}
