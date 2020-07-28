import {NgModule, Component} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {RoutingComponent} from './regular';

const selector = 'main-' + 'component';

@Component({
  selector,
  template: '<div *ngIf="visible">Hello world</div>'
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
    loadChildren: () => import('./lazy-b').then(m => m.LazyBModule)
  },
  {
    path: 'regular',
    component: RoutingComponent
  }
]);

@NgModule({
  imports: [CommonModule, BrowserModule, router],
  exports: [MainComponent],
  declarations: [MainComponent],
  bootstrap: [MainComponent]
})
export class AppModule {}
