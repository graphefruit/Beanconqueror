// error-tracking.service.ts
import { Injectable, ErrorHandler } from '@angular/core';
import { MatomoTrackingService } from './matomo-tracking.service';

@Injectable({
  providedIn: 'root',
})
export class ErrorTrackingService implements ErrorHandler {
  constructor(private matomoTracking: MatomoTrackingService) {
    // Enable JavaScript error tracking in Matomo
    this.enableJSErrorTracking();
  }

  /**
   * Enable JavaScript error tracking in Matomo
   */
  private enableJSErrorTracking(): void {
    window._paq = window._paq || [];
    window._paq.push(['enableJSErrorTracking']);
  }

  /**
   * Implement the ErrorHandler interface to catch and track errors
   * @param error The error to handle
   */
  handleError(error: any): void {
    let errorMessage = '';
    let errorStack = '';

    if (error instanceof Error) {
      errorMessage = error.message;
      errorStack = error.stack || '';
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = JSON.stringify(error);
    }

    // Track the error in Matomo as event
    window._paq.push([
      'trackEvent',
      'ApplicationError',
      'UnhandledError',
      errorMessage,
    ]);

    // Log to console for debugging
    console.error('Application error:', error);
  }
}
