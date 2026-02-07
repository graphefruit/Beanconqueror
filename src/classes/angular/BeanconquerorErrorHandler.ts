import { ErrorHandler } from '@angular/core';
import { UILog } from '../../services/uiLog';

export class BeanconquerorErrorHandler implements ErrorHandler {
  private ERROR_ORIGINAL_ERROR = 'ngOriginalError';
  private _console: Console;
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
