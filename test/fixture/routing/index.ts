import {NgModule, Component, Directive, Pipe} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {RoutingComponent} from './regular';

@Directive({ selector: '[dir]' })
export class SampleDirective {}

@Pipe({ name: 'samplePipe', pure: false })
export class SamplePipe {}

@Component({
  selector: 'main-component',
  templateUrl: 'main.component.html',
  styles: [
    `
      .inline {
        color: red;
      }
    `
  ],
  styleUrls: ['s1.css', 's2.css']
})
export class MainComponent {
  visible: boolean;
}

const router = RouterModule.forRoot([
  {
    path: 'lazy-a',
    loadChildren: './lazy-a#LazyAModule'
  },
  {
    path: 'lazy-b',
    loadChildren: './lazy-b#LazyBModule'
  },
  {
    path: 'regular',
    component: RoutingComponent
  }
]);

@NgModule({
  imports: [CommonModule, BrowserModule, router],
  exports: [MainComponent, SampleDirective],
  declarations: [MainComponent, SampleDirective, SamplePipe],
  bootstrap: [MainComponent]
})
export class AppModule {}
