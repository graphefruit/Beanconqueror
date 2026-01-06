import {
  ErrorHandler,
  enableProdMode,
  importProvidersFrom,
  provideZoneChangeDetection,
} from '@angular/core';

import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { Drivers } from '@ionic/storage';
import { IonicStorageModule } from '@ionic/storage-angular';
import { TranslateModule } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import CordovaSQLiteDriver from 'localforage-cordovasqlitedriver';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { BeanconquerorErrorHandler } from './classes/angular/BeanconquerorErrorHandler';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
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
    ),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: ErrorHandler, useClass: BeanconquerorErrorHandler },
    AndroidPermissions,
    provideHttpClient(withInterceptorsFromDi()),
    provideRouter(routes),
    provideZoneChangeDetection(),
  ],
}).catch((err) => console.log(err));
