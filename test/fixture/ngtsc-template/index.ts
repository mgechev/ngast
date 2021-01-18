import { NgModule, Component, Directive } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-component',
  template: `
    <div *ngFor="let foo of foos">
      <main-component></main-component>
    </div>
    <div transitive></div>
    <div unused></div>
  `,
})
export class AppComponent {
  foos = [];
}

@Component({
  selector: 'main-component',
  template: '<div main i18n>Hello world Updated {minutes, plural, =0 {just now} =1 {one minute ago}}</div>',
})
export class MainComponent {
  visible: boolean;
}

@Directive({
  selector: '[main]',
})
export class MainDirective {}

@Directive({
  selector: '[transitive]'
})
export class TransitiveDirective {}

@NgModule({
  declarations: [TransitiveDirective],
  exports: [TransitiveDirective]
})
export class TransitiveModule {}

@Directive({
  selector: '[unused]'
})
export class UnusedDirective {}

@NgModule({
  declarations: [UnusedDirective],
  exports: [UnusedDirective]
})
export class UnusedModule {}

@NgModule({
  imports: [CommonModule, BrowserModule, MatExpansionModule, BrowserAnimationsModule, TransitiveModule],
  exports: [MainComponent],
  declarations: [AppComponent, MainComponent, MainDirective],
  bootstrap: [AppComponent],
})
export class AppModule {}
