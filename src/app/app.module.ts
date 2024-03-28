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
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import CordovaSQLiteDriver from 'localforage-cordovasqlitedriver';
import { UILog } from '../services/uiLog';
// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

class MyErrorHandler implements ErrorHandler {
  private ERROR_ORIGINAL_ERROR = 'ngOriginalError';
  private _console;
  constructor() {
    this._console = console;
  }
  public handleError(error) {
    // do something with the exception
    const originalError = this._findOriginalError(error);
    this._console.error('ERROR', error);
    if (originalError) {
      this._console.error('ORIGINAL ERROR', originalError);
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
  imports: [
    BrowserModule,
    HttpClientModule,
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
  ],
  bootstrap: [AppComponent],
  exports: [],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {}
