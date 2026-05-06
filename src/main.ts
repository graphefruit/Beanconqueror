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
import { provideServiceWorker } from '@angular/service-worker';

import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { Drivers } from '@ionic/storage';
import { IonicStorageModule } from '@ionic/storage-angular';

import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { providePlatformPorts } from './app/platform/providers/platform.providers';
import { BeanconquerorErrorHandler } from './classes/angular/BeanconquerorErrorHandler';
import { environment } from './environments/environment';

function getStorageDriverOrder(): string[] {
  return [Drivers.IndexedDB, Drivers.LocalStorage];
}

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
    provideHttpClient(withInterceptorsFromDi()),
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: './assets/i18n/',
        suffix: '.json',
      }),
    }),
    provideRouter(routes),
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideZoneChangeDetection(),
    ...providePlatformPorts(),
    provideIonicAngular({
      mode: 'md',
      menuIcon: 'beanconqueror-menu',
      swipeBackEnabled: true,
      animated: true,
      rippleEffect: false,
    }),
  ],
}).catch((err) => console.log(err));
