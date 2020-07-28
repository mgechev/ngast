import { NgModule, Component, Inject, Injectable, InjectionToken } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';

export class BasicProvider {}
// const TOKEN = new InjectionToken('token', { providedIn: 'root', factory: () => true });

@Component({
  selector: 'main-component',
  template: '<div *ngIf="visible">Hello world</div>'
})
export class MainComponent {
  visible: boolean;
  constructor(public p: BasicProvider, @Inject('primitive') public primitive) {}
}

@Injectable()
export class CompositeProvider {
  constructor(public p: BasicProvider, @Inject('primitive') public primitive: string) {}
}

@NgModule({
  imports: [CommonModule, BrowserModule, MatExpansionModule, BrowserAnimationsModule],
  exports: [MainComponent],
  declarations: [MainComponent],
  bootstrap: [MainComponent],
  providers: [CompositeProvider, BasicProvider, { provide: 'primitive', useValue: '42' }]
})
export class AppModule {}
