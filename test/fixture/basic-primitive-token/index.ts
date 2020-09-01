import {NgModule, Component, Injectable, Inject} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {CommonModule} from '@angular/common';

@Injectable()
export class DependencyProvider {}

@Injectable()
export class BasicProvider {
  constructor(private test: DependencyProvider) {}
}

@Component({
  selector: 'main-component',
  template: '<div *ngIf="visible">Hello world</div>',
})
export class MainComponent {
  visible: boolean;
  constructor(private provider: BasicProvider) {}
}

@NgModule({
  imports: [CommonModule, BrowserModule],
  exports: [MainComponent],
  declarations: [MainComponent],
  bootstrap: [MainComponent],
  providers: [{ provide: BasicProvider, useClass: BasicProvider }, DependencyProvider]
})
export class AppModule {}
