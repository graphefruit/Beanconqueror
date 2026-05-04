import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  enableProdMode,
  ErrorHandler,
  importProvidersFrom,
  provideZoneChangeDetection,
} from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, RouteReuseStrategy } from '@angular/router';

import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { Drivers } from '@ionic/storage';
import { IonicStorageModule } from '@ionic/storage-angular';

import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import CordovaSQLiteDriver from 'localforage-cordovasqlitedriver';

function getStorageDriverOrder(): string[] {
  const isNativeRuntime =
    typeof window !== 'undefined' &&
    typeof (window as any).Capacitor !== 'undefined' &&
    (window as any).Capacitor.isNativePlatform?.() === true;

  if (isNativeRuntime) {
    return [
      Drivers.IndexedDB,
      CordovaSQLiteDriver._driver,
      Drivers.LocalStorage,
    ];
  }

  return [Drivers.IndexedDB, Drivers.LocalStorage];
}

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
      IonicStorageModule.forRoot({
        name: '__baristaDB',
        driverOrder: getStorageDriverOrder(),
      }),
    ),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: ErrorHandler, useClass: BeanconquerorErrorHandler },
    AndroidPermissions,
    provideHttpClient(withInterceptorsFromDi()),
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: './assets/i18n/',
        suffix: '.json',
      }),
    }),
    provideRouter(routes),
    provideZoneChangeDetection(),
    provideIonicAngular({
      mode: 'md',
      menuIcon: 'beanconqueror-menu',
      swipeBackEnabled: true,
      animated: true,
      rippleEffect: false,
    }),
  ],
}).catch((err) => console.log(err));
