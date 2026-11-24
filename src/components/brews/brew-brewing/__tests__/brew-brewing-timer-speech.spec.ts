import { NgZone } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { Settings } from '../../../../classes/settings/settings';
import { BrewBrewingComponent } from '../brew-brewing.component';

describe('BrewBrewingComponent brew time speech', () => {
  function brewing(settings: Partial<Settings> = {}) {
    const speech = jasmine.createSpyObj<{ speakTime: (text: string) => void }>(
      'TextToSpeechService',
      ['speakTime'],
    );
    const timer = { running: false, seconds: 0, milliseconds: 0 };
    const component = Object.assign(
      Object.create(BrewBrewingComponent.prototype),
      {
        textToSpeech: speech,
        settings: {
          text_to_speech_active: true,
          text_to_speech_brew_time: true,
          text_to_speech_brew_time_interval: 5,
          brew_milliseconds: false,
          ...settings,
        } as Settings,
        data: {},
        brewTimerTickedSubject: new Subject<boolean>(),
        ngZone: { runOutsideAngular: (fn: () => void) => fn() } as NgZone,
        translate: { instant: (key: string) => key } as TranslateService,
        timer: {
          isTimerRunning: () => timer.running,
          getSeconds: () => timer.seconds,
          getMilliseconds: () => timer.milliseconds,
        },
      },
    ) as BrewBrewingComponent;
    /** Like the brew timer: it shows the new time and then reports a tick. */
    const show = (seconds: number, milliseconds = 0) => {
      timer.seconds = seconds;
      timer.milliseconds = milliseconds;
      component.brewTimeTicked(undefined);
    };
    const start = () => {
      timer.running = true;
      component.brewTimeTicked(undefined);
    };
    const pause = () => {
      timer.running = false;
      component.brewTimeTicked(undefined);
    };
    const said = () => speech.speakTime.calls.allArgs().map(([text]) => text);
    return { show, start, pause, said };
  }

  it('says the time the timer shows when it reaches a multiple of the interval', () => {
    const { show, start, said } = brewing();

    start();
    for (let second = 1; second <= 10; second++) {
      show(second);
    }

    expect(said()).toEqual(['TEXT_TO_SPEECH.TIME 5', 'TEXT_TO_SPEECH.TIME 10']);
  });

  it('says quarter seconds when the timer shows milliseconds', () => {
    const { show, start, said } = brewing({
      brew_milliseconds: true,
      text_to_speech_brew_time_interval: 0.25,
    });

    start();
    for (let ms = 10; ms <= 1000; ms += 10) {
      show(Math.floor(ms / 1000), ms % 1000);
    }

    expect(said()).toEqual([
      'TEXT_TO_SPEECH.TIME 0.25',
      'TEXT_TO_SPEECH.TIME 0.5',
      'TEXT_TO_SPEECH.TIME 0.75',
      'TEXT_TO_SPEECH.TIME 1',
    ]);
  });

  it('goes on after a resume from where the timer stands', () => {
    const { show, start, pause, said } = brewing();

    start();
    show(4);
    pause();
    show(4);
    start();
    for (let second = 5; second <= 10; second++) {
      show(second);
    }

    expect(said()).toEqual(['TEXT_TO_SPEECH.TIME 5', 'TEXT_TO_SPEECH.TIME 10']);
  });

  it('says nothing while the timer stands or the brew time switch is off', () => {
    const standing = brewing();
    standing.show(5);
    const off = brewing({ text_to_speech_brew_time: false });
    off.start();
    off.show(5);
    const speechOff = brewing({ text_to_speech_active: false });
    speechOff.start();
    speechOff.show(5);

    expect(standing.said()).toEqual([]);
    expect(off.said()).toEqual([]);
    expect(speechOff.said()).toEqual([]);
  });
});
