import {NgModule, NO_ERRORS_SCHEMA} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {RouteReuseStrategy} from '@angular/router';

import {IonicModule, IonicRouteStrategy} from '@ionic/angular';

import {AppComponent} from './app.component';
import {AppRoutingModule} from './app-routing.module';
import {IonicStorageModule} from '@ionic/storage';

import {SharedModule} from './shared/shared.module';


@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [
    BrowserModule,
    IonicModule.forRoot({
      mode:'md'}),
    IonicStorageModule.forRoot({
      name: '__baristaDB',
      driverOrder: ['indexeddb', 'sqlite', 'websql']
    }),
    AppRoutingModule,
    SharedModule,
  ],
  providers: [
    {provide: RouteReuseStrategy, useClass: IonicRouteStrategy},
  ],
  bootstrap: [AppComponent],
  exports:[],
  schemas: [ NO_ERRORS_SCHEMA ]
})
export class AppModule {
}
