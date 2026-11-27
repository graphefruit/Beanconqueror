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
      ['speak', 'speakInFull', 'end'],
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
          text_to_speech_weight: true,
          text_to_speech_brew_time: true,
          text_to_speech_brew_start_end: true,
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

  const noDevices = (): unknown =>
    jasmine.createSpyObj('CoffeeBluetoothDevicesService', {
      getScale: null,
      getPressureDevice: null,
      getTemperatureDevice: null,
    });

  afterEach(() => component.deattachToTextToSpeedChange());

  it('says the brew weight with tenths, for every preparation', fakeAsync(() => {
    for (const styleType of [
      PREPARATION_STYLE_TYPE.POUR_OVER,
      PREPARATION_STYLE_TYPE.ESPRESSO,
    ]) {
      create({}, styleType);

      component.attachToTextToSpeechChange();
      tick(1000);

      expect(textToSpeech.speak.calls.allArgs())
        .withContext(styleType)
        .toEqual([['18.5'], ['18.5']]);
      component.deattachToTextToSpeedChange();
    }
  }));

  it('says the brew weight in whole grams when chosen', fakeAsync(() => {
    for (const styleType of [
      PREPARATION_STYLE_TYPE.POUR_OVER,
      PREPARATION_STYLE_TYPE.ESPRESSO,
    ]) {
      create({ text_to_speech_whole_grams: true }, styleType);

      component.attachToTextToSpeechChange();
      tick(500);

      expect(textToSpeech.speak.calls.allArgs())
        .withContext(styleType)
        .toEqual([['18']]);
      component.deattachToTextToSpeedChange();
    }
  }));

  it('says the weight only, as the brew time is said from the timer', fakeAsync(() => {
    create({});

    component.attachToTextToSpeechChange();
    tick(1000);

    expect(textToSpeech.speak.calls.count()).toBe(2);
    expect(textToSpeech.speakInFull.calls.count()).toBe(0);
  }));

  it('says no weight when its switch is off', fakeAsync(() => {
    create({ text_to_speech_weight: false });

    component.attachToTextToSpeechChange();
    tick(5000);

    expect(textToSpeech.speak.calls.count()).toBe(0);
  }));

  it('announces the brew start without a scale, unless its switch is off', async () => {
    for (const startAndEnd of [true, false]) {
      create({ text_to_speech_brew_start_end: startAndEnd });
      Object.assign(component, { bleManager: noDevices() });

      await component.timerStarted(undefined);

      expect(textToSpeech.speakInFull.calls.allArgs())
        .withContext(`start and end ${startAndEnd}`)
        .toEqual(startAndEnd ? [['TEXT_TO_SPEECH.BREW_STARTED']] : []);
    }
  });

  it('announces the brew end with the scale values', async () => {
    create({});

    await component.timerPaused(undefined);

    expect(scale.setTimer.calls.count()).toBe(1);
    expect(textToSpeech.speak.calls.allArgs()).toEqual([
      ['TEXT_TO_SPEECH.BREW_ENDED', true],
    ]);
  });

  it('announces the brew end without a scale', async () => {
    create({});
    Object.assign(component, { bleManager: noDevices() });

    await component.timerPaused(undefined);

    expect(textToSpeech.speak.calls.allArgs()).toEqual([
      ['TEXT_TO_SPEECH.BREW_ENDED', true],
    ]);
  });

  it('only stops what is said at the brew end when its switch is off', async () => {
    create({ text_to_speech_brew_start_end: false });

    await component.timerPaused(undefined);

    expect(textToSpeech.speak.calls.count()).toBe(0);
    expect(textToSpeech.end.calls.count()).toBe(1);
  });
});
