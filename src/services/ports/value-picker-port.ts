import { inject, InjectionToken } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import {
  CordovaDatePickerAdapter,
  CordovaDateTimePicker,
} from './cordova-date-picker-adapter';
import type { PortResult } from './port-result';

/** What the person did in the picker. */
export type DatePick =
  | { readonly kind: 'chosen'; readonly date: Date }
  | { readonly kind: 'cleared' }
  | { readonly kind: 'cancelled' };

/** The app's only way to the native date picker; failures arrive as results. */
export interface ValuePickerPort {
  /** Opens the date picker on `start`. */
  pickDate(start: Date): Promise<PortResult<DatePick>>;
}

/**
 * The stored value of a date field after a pick: an ISO date, '' once cleared, or undefined
 * when the field stays as it is (cancelled or failed).
 */
export function pickedDateValue(
  pick: PortResult<DatePick>,
): string | undefined {
  if (!pick.ok || pick.value.kind === 'cancelled') {
    return undefined;
  }
  return pick.value.kind === 'chosen' ? pick.value.date.toISOString() : '';
}

export const VALUE_PICKER_PORT = new InjectionToken<ValuePickerPort>(
  'VALUE_PICKER_PORT',
  {
    providedIn: 'root',
    factory: () => {
      const translate = inject(TranslateService);
      return new CordovaDatePickerAdapter(
        // The Cordova plugin sets this global on native platforms only.
        () =>
          (
            window as {
              cordova?: {
                plugins?: { DateTimePicker?: CordovaDateTimePicker };
              };
            }
          ).cordova?.plugins?.DateTimePicker,
        (key) => translate.instant(key) as string,
      );
    },
  },
);
