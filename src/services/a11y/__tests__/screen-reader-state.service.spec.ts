import { fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';

import { Platform } from '@ionic/angular';

import { Capacitor } from '@capacitor/core';
import { ScreenReader, StateChangeListener } from '@capacitor/screen-reader';
import { Subject } from 'rxjs';

import { UILog } from '../../uiLog';
import {
  SCREEN_READER,
  ScreenReaderSource,
  ScreenReaderState,
} from '../screen-reader-state.service';

describe('ScreenReaderState', () => {
  let stateChange: StateChangeListener | undefined;
  let resume: Subject<void>;

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
    resume = new Subject<void>();
    TestBed.configureTestingModule({
      providers: [
        { provide: SCREEN_READER, useValue: screenReader },
        { provide: Platform, useValue: { resume } },
      ],
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

  it('reads the state again when the app comes back to the foreground', fakeAsync(() => {
    const screenReader = plugin(Promise.resolve({ value: false }));
    const state = create(screenReader);
    flushMicrotasks();

    // VoiceOver switched on in the Settings app; the event got lost meanwhile.
    screenReader.isEnabled.and.resolveTo({ value: true });
    resume.next();
    flushMicrotasks();
    expect(state.on()).toBeTrue();

    screenReader.isEnabled.and.resolveTo({ value: false });
    resume.next();
    flushMicrotasks();
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
