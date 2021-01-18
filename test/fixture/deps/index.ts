import { NgModule, Component, Inject, Injectable } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Injectable()
export class BasicProvider {}

@Component({
  selector: 'main-component',
  template: '<button mat-button></button><div *ngIf="visible">Hello world</div>'
})
export class MainComponent {
  visible: boolean;
}

export class CompositeProvider {
  constructor(public p: BasicProvider, @Inject('primitive') public primitive: string) {}
}

@NgModule({
  imports: [CommonModule, BrowserModule, MatButtonModule, BrowserAnimationsModule],
  exports: [MainComponent],
  declarations: [MainComponent],
  bootstrap: [MainComponent],
  providers: [CompositeProvider, BasicProvider, { provide: 'primitive', useValue: '42' }]
})
export class AppModule {}
