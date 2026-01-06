import { ErrorHandler, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideRouter, RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { Drivers } from '@ionic/storage';
import { IonicStorageModule } from '@ionic/storage-angular';
import { SharedModule } from './shared/shared.module';

import { TranslateModule } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import CordovaSQLiteDriver from 'localforage-cordovasqlitedriver';
import { BeanconquerorErrorHandler } from '../classes/angular/BeanconquerorErrorHandler';
import { routes } from './app.routes';

@NgModule({
  declarations: [AppComponent],
  bootstrap: [AppComponent],
  exports: [],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    BrowserModule,
    TranslateModule.forRoot({
      loader: provideTranslateHttpLoader({
        prefix: './assets/i18n/',
        suffix: '.json',
      }),
    }),
    IonicModule.forRoot({
      mode: 'md',
      menuIcon: 'beanconqueror-menu',
      swipeBackEnabled: true,
      animated: true,
      rippleEffect: false,
    }),
    IonicStorageModule.forRoot({
      name: '__baristaDB',
      driverOrder: [
        Drivers.IndexedDB,
        CordovaSQLiteDriver._driver,
        Drivers.LocalStorage,
      ],
    }),
    SharedModule,
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: ErrorHandler, useClass: BeanconquerorErrorHandler },
    provideHttpClient(withInterceptorsFromDi()),
    provideRouter(routes),
  ],
})
export class AppModule {}
