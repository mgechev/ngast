import {NgModule, Component, Injectable} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {AboutModule} from './about.module';

@Injectable()
export class BasicViewProvider {}

@Component({
  selector: 'main-component',
  template: 'Hello world',
})
export class MainComponent {
}

@NgModule({
  imports: [BrowserModule, AboutModule],
  exports: [MainComponent],
  declarations: [MainComponent],
  bootstrap: [MainComponent]
})
export class AppModule {}
