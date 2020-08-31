import { NgModule, Component, Injectable, Directive, Pipe, PipeTransform } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

@Injectable()
export class BasicViewProvider {}

@Component({
  selector: 'main-component',
  template: '<div *ngIf="visible">Hello world</div>',
  viewProviders: [BasicViewProvider]
})
export class MainComponent {
  visible: boolean;
}

@Directive({ selector: '[main]' })
export class MainDirective {}


@Pipe({ name: 'main' })
export class MainPipe implements PipeTransform {
  constructor(public p: BasicProvider) {}
  transform(value: any) {
    return value;
  }
}


export class BasicProvider {}

@NgModule({
  imports: [CommonModule, BrowserModule],
  exports: [MainComponent],
  declarations: [MainComponent, MainDirective, MainPipe],
  bootstrap: [MainComponent],
  providers: [BasicProvider]
})
export class AppModule {}
