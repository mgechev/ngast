import {NgModule, Component, Renderer} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {CommonModule} from '@angular/common';

export class SampleViewProvider {}

export class SampleProvider {}

@Component({
  selector: 'main-component',
  template: '<div *ngIf="visible">Hello world</div>',
  viewProviders: [SampleViewProvider],
  providers: [SampleProvider],
})
export class MainComponent {
  visible: boolean;
  constructor(private renderer: Renderer) {}
}

@NgModule({
  imports: [CommonModule, BrowserModule],
  exports: [MainComponent],
  declarations: [MainComponent],
  bootstrap: [MainComponent]
})
export class AppModule {}
