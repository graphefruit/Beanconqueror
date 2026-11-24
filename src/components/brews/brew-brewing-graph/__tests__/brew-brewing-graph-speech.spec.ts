import { NgZone } from '@angular/core';
import { fakeAsync, tick } from '@angular/core/testing';

import { PREPARATION_STYLE_TYPE } from '../../../../enums/preparations/preparationStyleTypes';
import { TextToSpeechService } from '../../../../services/textToSpeech/text-to-speech.service';
import { BrewBrewingGraphComponent } from '../brew-brewing-graph.component';

describe('BrewBrewingGraphComponent spoken scale values', () => {
  let component: BrewBrewingGraphComponent;
  let textToSpeech: jasmine.SpyObj<TextToSpeechService>;
  let scale: jasmine.SpyObj<{ setTimer: () => void }>;

  function create(
    settings: object,
    styleType = PREPARATION_STYLE_TYPE.POUR_OVER,
  ) {
    textToSpeech = jasmine.createSpyObj<TextToSpeechService>(
      'TextToSpeechService',
      ['speak', 'speakInFull'],
    );
    scale = jasmine.createSpyObj('BluetoothScale', ['setTimer']);
    const bleManager = jasmine.createSpyObj('CoffeeBluetoothDevicesService', {
      getScale: scale,
      getPressureDevice: null,
      getTemperatureDevice: null,
    });
    component = Object.assign(
      Object.create(BrewBrewingGraphComponent.prototype),
      {
        textToSpeech,
        bleManager,
        brewComponent: {},
        platform: { is: () => true },
        translate: { instant: (key: string) => key },
        ngZone: { runOutsideAngular: (run: () => void) => run() } as NgZone,
        data: {
          brew_time: 12,
          getPreparation: () => ({ style_type: styleType }),
        },
        flowProfileTempAll: [{ weight: 18.46 }],
        settings: {
          text_to_speech_active: true,
          text_to_speech_timer_only: false,
          text_to_speech_whole_grams: false,
          text_to_speech_interval_rate: 500,
          ...settings,
        },
      },
    );
    for (const method of [
      'deattachToWeightChange',
      'deattachToFlowChange',
      'updateChart',
    ] as const) {
      spyOn(component, method).and.stub();
    }
  }

  afterEach(() => component.deattachToTextToSpeedChange());

  it('says the espresso weight in whole grams when chosen', fakeAsync(() => {
    create(
      { text_to_speech_whole_grams: true },
      PREPARATION_STYLE_TYPE.ESPRESSO,
    );

    component.attachToTextToSpeechChange();
    tick(500);

    expect(textToSpeech.speak.calls.allArgs()).toEqual([['18']]);
  }));

  it('leaves weight and time to the timer when only the time is said', fakeAsync(() => {
    create({ text_to_speech_timer_only: true });

    component.attachToTextToSpeechChange();
    tick(5000);

    expect(textToSpeech.speak.calls.count()).toBe(0);
    expect(textToSpeech.speakInFull.calls.count()).toBe(0);
  }));

  it('leaves the brew end to the timer when only the time is said', async () => {
    create({ text_to_speech_timer_only: true });

    await component.timerPaused(undefined);

    expect(scale.setTimer.calls.count()).toBe(1);
    expect(textToSpeech.speak.calls.count()).toBe(0);
  });

  it('announces the brew end with the scale values', async () => {
    create({});

    await component.timerPaused(undefined);

    expect(textToSpeech.speak.calls.allArgs()).toEqual([
      ['TEXT_TO_SPEECH.BREW_ENDED', true],
    ]);
  });
});
