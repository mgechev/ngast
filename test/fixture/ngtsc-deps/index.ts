import { NgModule, Component, Inject, Injectable, InjectionToken, Directive } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';

@Injectable()
export class BasicProvider {}

const TOKEN = new InjectionToken('token');

@Component({
  selector: 'main-component',
  template: '<div>Hello world</div>',
  providers: [{ provide: TOKEN, useValue: true }],
})
export class MainComponent {
  visible: boolean;
  constructor(
    public p: BasicProvider,
    @Inject('primitive') public primitive,
    @Inject(TOKEN) public isTrue,
  ) {}
}

@Directive({ selector: '[main]' })
export class MainDirective {
  constructor(public p: BasicProvider) {}
}

@Injectable()
export class CompositeProvider {
  constructor(
    public p: BasicProvider,
    @Inject('primitive') public primitive: string,
  ) {}
}

@NgModule({
  imports: [CommonModule, BrowserModule, MatExpansionModule, BrowserAnimationsModule],
  exports: [MainComponent],
  declarations: [MainComponent, MainDirective],
  bootstrap: [MainComponent],
  providers: [
    CompositeProvider,
    BasicProvider,
    { provide: 'primitive', useValue: '42' },
  ]
})
export class AppModule {}
