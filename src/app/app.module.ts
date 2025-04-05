import { ErrorHandler, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { Drivers } from '@ionic/storage';
import { IonicStorageModule } from '@ionic/storage-angular';
import { SharedModule } from './shared/shared.module';

import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import {
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import CordovaSQLiteDriver from 'localforage-cordovasqlitedriver';
import { UILog } from '../services/uiLog';

// Import the tracking services
import { MatomoTrackingService } from './data/tracking/matomo-tracking.service';
import { StatisticsTrackingService } from './data/tracking/statistics-tracking.service';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

class MyErrorHandler implements ErrorHandler {
  private ERROR_ORIGINAL_ERROR = 'ngOriginalError';
  private _console;
  private matomoTracking: MatomoTrackingService;

  constructor() {
    this._console = console;

    // We need to get the service this way since the ErrorHandler is instantiated before DI
    setTimeout(() => {
      this.matomoTracking = window['injector'].get(MatomoTrackingService);
    });
  }

  public handleError(error) {
    // do something with the exception
    const originalError = this._findOriginalError(error);
    this._console.error('ERROR', error);
    if (originalError) {
      this._console.error('ORIGINAL ERROR', originalError);
    }

    // Track error in Matomo if service is available
    if (this.matomoTracking) {
      try {
        const errorMessage =
          error instanceof Error ? error.message : JSON.stringify(error);
        this.matomoTracking.trackEvent(
          'ApplicationError',
          'UnhandledError',
          errorMessage,
        );

        if (originalError) {
          const originalErrorMessage =
            originalError instanceof Error
              ? originalError.message
              : JSON.stringify(originalError);
          this.matomoTracking.trackEvent(
            'ApplicationError',
            'OriginalError',
            originalErrorMessage,
          );
        }
      } catch (e) {
        // Fail silently - don't let error tracking cause more issues
      }
    }

    try {
      try {
        UILog.getInstance().unhandledError(JSON.stringify(error));
      } catch (ex) {
        try {
          UILog.getInstance().unhandledError(error.toString());
        } catch (ex) {}
      }
      if (originalError) {
        try {
          UILog.getInstance().unhandledError(JSON.stringify(originalError));
        } catch (ex) {
          try {
            UILog.getInstance().unhandledError(originalError.toString());
          } catch (ex) {}
        }
      }
    } catch (ex) {}
  }

  private wrappedError(message, originalError) {
    const msg = `${message} caused by: ${
      originalError instanceof Error ? originalError.message : originalError
    }`;
    const error = Error(msg);
    error[this.ERROR_ORIGINAL_ERROR] = originalError;
    return error;
  }
  private getOriginalError(error) {
    return error[this.ERROR_ORIGINAL_ERROR];
  }
  /** @internal */
  private _findOriginalError(error) {
    let e = error && this.getOriginalError(error);
    while (e && this.getOriginalError(e)) {
      e = this.getOriginalError(e);
    }
    return e || null;
  }
}

@NgModule({
  declarations: [AppComponent],
  bootstrap: [AppComponent],
  exports: [],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    BrowserModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
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
    AppRoutingModule,
    SharedModule,
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: ErrorHandler, useClass: MyErrorHandler },
    // Add the tracking services
    MatomoTrackingService,
    StatisticsTrackingService,
    provideHttpClient(withInterceptorsFromDi()),
  ],
})
export class AppModule {
  constructor(private injector: Injector) {
    // Store injector for access in ErrorHandler
    window['injector'] = injector;
  }
}
