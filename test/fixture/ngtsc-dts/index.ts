import { NgModule, Directive } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

@Directive()
export class ExportedDirective {}

@NgModule({
  declarations: [ExportedDirective],
  exports: [ExportedDirective]
})
export class LocalModule {}

@NgModule({
  declarations: [ExportedDirective],
  imports: [BrowserModule, LocalModule]
})
export class AppModule {}

