import { fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';

import { Capacitor } from '@capacitor/core';
import { ScreenReader, StateChangeListener } from '@capacitor/screen-reader';

import { UILog } from '../../uiLog';
import {
  SCREEN_READER,
  ScreenReaderSource,
  ScreenReaderState,
} from '../screen-reader-state.service';

describe('ScreenReaderState', () => {
  let stateChange: StateChangeListener | undefined;

  function plugin(enabled: Promise<{ value: boolean }>) {
    stateChange = undefined;
    return {
      speak: jasmine.createSpy('speak'),
      isEnabled: jasmine.createSpy('isEnabled').and.returnValue(enabled),
      addListener: jasmine
        .createSpy('addListener')
        .and.callFake((_event: string, listener: StateChangeListener) => {
          stateChange = listener;
          return Promise.resolve({ remove: () => Promise.resolve() });
        }),
    };
  }

  function create(screenReader: ScreenReaderSource | null): ScreenReaderState {
    TestBed.configureTestingModule({
      providers: [{ provide: SCREEN_READER, useValue: screenReader }],
    });
    return TestBed.inject(ScreenReaderState);
  }

  it('is off where the state is not known (web)', () => {
    expect(create(null).on()).toBeFalse();
  });

  it('reads the state once', fakeAsync(() => {
    const screenReader = plugin(Promise.resolve({ value: true }));
    const state = create(screenReader);
    flushMicrotasks();

    expect(state.on()).toBeTrue();
    expect(state.on()).toBeTrue();
    expect(screenReader.isEnabled).toHaveBeenCalledTimes(1);
  }));

  it('follows the screen reader being turned on and off', fakeAsync(() => {
    const state = create(plugin(Promise.resolve({ value: false })));
    flushMicrotasks();
    expect(state.on()).toBeFalse();

    stateChange({ value: true });
    expect(state.on()).toBeTrue();

    stateChange({ value: false });
    expect(state.on()).toBeFalse();
  }));

  it('stays off and logs when the state cannot be read', fakeAsync(() => {
    const state = create(plugin(Promise.reject(new Error('unavailable'))));
    const warn = spyOn(TestBed.inject(UILog), 'warn');
    flushMicrotasks();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(state.on()).toBeFalse();
  }));
});

describe('SCREEN_READER', () => {
  it('is not used on the web', () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);

    expect(TestBed.inject(SCREEN_READER)).toBeNull();
  });

  it('is the screen reader plugin on a device', () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);

    // Plugin proxies answer every property, so Jasmine cannot print them.
    expect(TestBed.inject(SCREEN_READER) === ScreenReader).toBeTrue();
  });
});
