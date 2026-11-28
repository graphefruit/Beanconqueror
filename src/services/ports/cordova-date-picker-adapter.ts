import { messageOf, type PortResult } from './port-result';
import type { DatePick, ValuePickerPort } from './value-picker-port';

/** The part of skwas-cordova-plugin-datetimepicker's `DateTimePicker` the app uses. */
export interface CordovaDateTimePicker {
  show(options: {
    mode: 'date';
    date: Date;
    okText: string;
    cancelText: string;
    clearText: string;
    /** Called without a date when the person cleared the field. */
    success: (date?: Date) => void;
    cancel: () => void;
    error: (error: unknown) => void;
  }): void;
}

const UNAVAILABLE: PortResult<never> = {
  ok: false,
  error: 'Date picker unavailable',
};

/** VALUE_PICKER_PORT over the Cordova plugin: the only code that touches its global. */
export class CordovaDatePickerAdapter implements ValuePickerPort {
  constructor(
    private readonly picker: () => CordovaDateTimePicker | undefined,
    /** The translated text of a key, for the buttons. */
    private readonly text: (key: string) => string,
  ) {}

  public pickDate(start: Date): Promise<PortResult<DatePick>> {
    const picker = this.picker();
    if (!picker) {
      return Promise.resolve(UNAVAILABLE);
    }
    return new Promise((resolve) => {
      const picked = (value: DatePick) => resolve({ ok: true, value });
      picker.show({
        mode: 'date',
        date: start,
        okText: this.text('CHOOSE'),
        cancelText: this.text('CANCEL'),
        clearText: this.text('DELETE'),
        success: (date) =>
          picked(
            date === undefined ? { kind: 'cleared' } : { kind: 'chosen', date },
          ),
        cancel: () => picked({ kind: 'cancelled' }),
        error: (error) => resolve({ ok: false, error: messageOf(error) }),
      });
    });
  }
}
