import { NgZone } from '@angular/core';
import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';

import { TranslateService } from '@ngx-translate/core';

import { Settings } from '../../../../classes/settings/settings';
import { BrewBrewingComponent } from '../brew-brewing.component';

describe('BrewBrewingComponent brew time speech', () => {
  function brewing(timerOnly: boolean) {
    const speech = {
      speak: jasmine.createSpy('speak'),
      speakInFull: jasmine.createSpy('speakInFull'),
      end: jasmine.createSpy('end'),
    };
    const settings = {
      text_to_speech_active: true,
      text_to_speech_timer_only: timerOnly,
    } as Settings;
    let seconds = 0;
    // Only the timer handlers are needed; no scale is connected.
    const component = Object.assign(
      Object.create(BrewBrewingComponent.prototype),
      {
        textToSpeech: speech,
        settings,
        ngZone: { runOutsideAngular: (fn: () => void) => fn() } as NgZone,
        translate: { instant: (key: string) => key } as TranslateService,
        timer: {
          isTimerRunning: () => false,
          getSeconds: () => seconds,
        },
        brewBrewingGraphEl: jasmine.createSpyObj('BrewBrewingGraphComponent', {
          timerStarted: Promise.resolve(),
          timerPaused: Promise.resolve(),
          timerResumed: Promise.resolve(),
          timerReset: Promise.resolve(),
          destroy: undefined,
        }),
      },
    ) as BrewBrewingComponent;
    const advance = (ms: number) => {
      for (let passed = 0; passed < ms; passed += 1000) {
        seconds++;
        tick(1000);
      }
    };
    return { component, textToSpeech: speech, advance };
  }

  it('says the start, the brew time every 5 seconds and the end', fakeAsync(() => {
    const { component, textToSpeech, advance } = brewing(true);

    void component.timerStarted(undefined);
    flushMicrotasks();
    advance(10000);
    void component.timerPaused(undefined);
    flushMicrotasks();
    advance(10000);

    expect(textToSpeech.speakInFull.calls.allArgs()).toEqual([
      ['TEXT_TO_SPEECH.BREW_STARTED'],
      ['TEXT_TO_SPEECH.TIME 5'],
      ['TEXT_TO_SPEECH.TIME 10'],
    ]);
    expect(textToSpeech.speak.calls.allArgs()).toEqual([
      ['TEXT_TO_SPEECH.BREW_ENDED', true],
    ]);
    expect(textToSpeech.end).toHaveBeenCalledTimes(1);
  }));

  it('goes on after a resume and stops on reset and when left', fakeAsync(() => {
    const { component, textToSpeech, advance } = brewing(true);

    void component.timerStarted(undefined);
    flushMicrotasks();
    void component.timerPaused(undefined);
    flushMicrotasks();
    void component.timerResumed(undefined);
    flushMicrotasks();
    advance(5000);
    void component.timerReset(undefined);
    flushMicrotasks();
    advance(5000);
    void component.timerResumed(undefined);
    flushMicrotasks();
    component.ngOnDestroy();
    advance(10000);

    // A resume goes on with the time and does not start the brew again.
    expect(textToSpeech.speakInFull.calls.allArgs()).toEqual([
      ['TEXT_TO_SPEECH.BREW_STARTED'],
      ['TEXT_TO_SPEECH.TIME 5'],
    ]);
    expect(textToSpeech.end).toHaveBeenCalledTimes(3);
  }));

  it('leaves the brew time to the scale when not only the timer is said', fakeAsync(() => {
    const { component, textToSpeech, advance } = brewing(false);

    void component.timerStarted(undefined);
    flushMicrotasks();
    advance(10000);
    void component.timerPaused(undefined);
    flushMicrotasks();

    expect(textToSpeech.speakInFull).not.toHaveBeenCalled();
    expect(textToSpeech.speak).not.toHaveBeenCalled();
    expect(textToSpeech.end).not.toHaveBeenCalled();
  }));
});
