import { ErrorHandler } from '@angular/core';

import { UILog } from '../../services/uiLog';

export class BeanconquerorErrorHandler implements ErrorHandler {
  private ERROR_ORIGINAL_ERROR = 'ngOriginalError';
  private _console: Console;
  constructor() {
    this._console = console;
  }
  public handleError(error: unknown) {
    // do something with the exception
    const originalError = this._findOriginalError(error);
    this._console.error('ERROR', error);
    if (originalError) {
      this._console.error('ORIGINAL ERROR', originalError);
    }
    try {
      UILog.getInstance().unhandledError(error);
    } catch (ex) {
      // Shouldn't ever happen, but if it does, still try to log the originalError
    }
    if (originalError) {
      try {
        UILog.getInstance().unhandledError(originalError);
      } catch (ex) {
        // Shouldn't ever happen, but if it does, don't explode
      }
    }
  }

  private getOriginalError(error: unknown): unknown {
    return error[this.ERROR_ORIGINAL_ERROR];
  }

  /** @internal */
  private _findOriginalError(error: unknown) {
    let e = error && this.getOriginalError(error);
    while (e && this.getOriginalError(e)) {
      e = this.getOriginalError(e);
    }
    return e || null;
  }
}
