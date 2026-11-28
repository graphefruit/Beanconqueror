import { TestBed } from '@angular/core/testing';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { valuePickerPortContract } from '../../../test-utils/contracts/value-picker-port.contract';
import {
  CordovaDatePickerAdapter,
  CordovaDateTimePicker,
} from '../cordova-date-picker-adapter';
import type { PortResult } from '../port-result';
import {
  DatePick,
  pickedDateValue,
  VALUE_PICKER_PORT,
} from '../value-picker-port';

type ShowOptions = Parameters<CordovaDateTimePicker['show']>[0];

/** The plugin global as skwas-cordova-plugin-datetimepicker sets it, answering like a device. */
class PickerStub implements CordovaDateTimePicker {
  public answer: PortResult<DatePick> = {
    ok: true,
    value: { kind: 'cancelled' },
  };
  /** When set, the plugin fails with this instead of an error object. */
  public failure: unknown;
  public options: ShowOptions | undefined;

  public show(options: ShowOptions): void {
    this.options = options;
    const answer = this.answer;
    if (this.failure !== undefined) {
      options.error(this.failure);
    } else if ('error' in answer) {
      options.error(new Error(answer.error));
    } else if (answer.value.kind === 'chosen') {
      options.success(answer.value.date);
    } else if (answer.value.kind === 'cleared') {
      // The plugin calls success without a date once the person clears the field.
      options.success();
    } else {
      options.cancel();
    }
  }
}

valuePickerPortContract('CordovaDatePickerAdapter', () => {
  const picker = new PickerStub();
  return {
    port: new CordovaDatePickerAdapter(
      () => picker,
      (key) => key,
    ),
    answer: (answer) => (picker.answer = answer),
    lastStart: () => picker.options?.date,
  };
});

describe('CordovaDatePickerAdapter', () => {
  let picker: PickerStub;

  beforeEach(() => {
    picker = new PickerStub();
  });

  it('opens a date picker with translated buttons', async () => {
    const adapter = new CordovaDatePickerAdapter(
      () => picker,
      (key) => `t:${key}`,
    );

    await adapter.pickDate(new Date(0));

    expect(picker.options).toEqual(
      jasmine.objectContaining({
        mode: 'date',
        okText: 't:CHOOSE',
        cancelText: 't:CANCEL',
        clearText: 't:DELETE',
      }),
    );
  });

  it('passes on a plugin failure given as text', async () => {
    picker.failure = 'Activity destroyed';
    const adapter = new CordovaDatePickerAdapter(
      () => picker,
      (key) => key,
    );

    expect(await adapter.pickDate(new Date(0))).toEqual({
      ok: false,
      error: 'Activity destroyed',
    });
  });

  it('works without the plugin, as in the browser', async () => {
    const browser = new CordovaDatePickerAdapter(
      () => undefined,
      (key) => key,
    );

    expect(await browser.pickDate(new Date(0))).toEqual({
      ok: false,
      error: 'Date picker unavailable',
    });
  });

  describe('VALUE_PICKER_PORT', () => {
    const globals = window as {
      cordova?: { plugins?: { DateTimePicker?: CordovaDateTimePicker } };
    };

    const before = globals.cordova;

    beforeEach(() => {
      TestBed.configureTestingModule({ imports: [TranslateModule.forRoot()] });
    });

    afterEach(() => (globals.cordova = before));

    it('reads the plugin global when it is used, after Cordova has set it', async () => {
      const port = TestBed.inject(VALUE_PICKER_PORT);
      expect((await port.pickDate(new Date(0))).ok).toBeFalse();

      TestBed.inject(TranslateService).setTranslation('en', {
        CHOOSE: 'Choose',
      });
      TestBed.inject(TranslateService).use('en');
      globals.cordova = { plugins: { DateTimePicker: picker } };

      expect(await port.pickDate(new Date(0))).toEqual({
        ok: true,
        value: { kind: 'cancelled' },
      });
      expect(picker.options?.okText).toBe('Choose');
    });
  });
});

describe('pickedDateValue', () => {
  const DATE = new Date('2026-11-20T00:00:00.000Z');
  const cases: [string, PortResult<DatePick>, string | undefined][] = [
    [
      'a chosen date',
      { ok: true, value: { kind: 'chosen', date: DATE } },
      '2026-11-20T00:00:00.000Z',
    ],
    ['a cleared date', { ok: true, value: { kind: 'cleared' } }, ''],
    ['a cancelled pick', { ok: true, value: { kind: 'cancelled' } }, undefined],
    ['a failed pick', { ok: false, error: 'Activity destroyed' }, undefined],
  ];

  for (const [name, pick, value] of cases) {
    it(`stores ${String(value)} for ${name}`, () => {
      expect(pickedDateValue(pick)).toBe(value);
    });
  }
});
