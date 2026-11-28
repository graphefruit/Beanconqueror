import {
  provideHttpClient,
  withInterceptorsFromDi,
  withXhr,
} from '@angular/common/http';
import {
  enableProdMode,
  ErrorHandler,
  importProvidersFrom,
  provideZoneChangeDetection,
} from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, RouteReuseStrategy } from '@angular/router';

import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { Drivers } from '@ionic/storage';
import { IonicStorageModule } from '@ionic/storage-angular';

import {
  provideTranslateLoader,
  provideTranslateService,
} from '@ngx-translate/core';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { BeanconquerorErrorHandler } from './classes/angular/BeanconquerorErrorHandler';
import { environment } from './environments/environment';
import { NonEmptyTranslateLoader } from './services/translate/non-empty-translate-loader';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      IonicStorageModule.forRoot({
        name: '__baristaDB',
        driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
      }),
    ),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: ErrorHandler, useClass: BeanconquerorErrorHandler },
    provideHttpClient(withXhr(), withInterceptorsFromDi()),
    provideTranslateService({
      // The app will set the user-preferred language later, this is just a default
      lang: 'en',
      // The app will never change the fallback language
      fallbackLang: 'en',

      loader: provideTranslateLoader(NonEmptyTranslateLoader),
    }),
    provideRouter(routes),
    provideZoneChangeDetection(),
    provideIonicAngular({
      mode: 'md',
      menuIcon: 'beanconqueror-menu',
      swipeBackEnabled: true,
      animated: true,
      rippleEffect: false,
      useSetInputAPI: true, // required for modern signal-based input() in modals. See https://github.com/ionic-team/ionic-framework/issues/28876
    }),
  ],
}).catch((err) => console.log(err));
