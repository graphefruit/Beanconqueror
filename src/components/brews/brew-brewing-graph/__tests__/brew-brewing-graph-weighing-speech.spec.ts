import { NgZone } from '@angular/core';
import { discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { PREPARATION_STYLE_TYPE } from '../../../../enums/preparations/preparationStyleTypes';
import { TextToSpeechService } from '../../../../services/textToSpeech/text-to-speech.service';
import { BrewBrewingGraphComponent } from '../brew-brewing-graph.component';

describe('BrewBrewingGraphComponent spoken weight before the brew', () => {
  let component: BrewBrewingGraphComponent;
  let textToSpeech: jasmine.SpyObj<TextToSpeechService>;
  let scale: jasmine.SpyObj<{
    getWeight: () => number;
    setTimer: () => void;
    tare: () => void;
  }>;
  let timer: { hasStarted: boolean; running: boolean };

  function create(settings: object = {}, withScale = true) {
    textToSpeech = jasmine.createSpyObj<TextToSpeechService>(
      'TextToSpeechService',
      ['speak', 'speakInFull', 'end'],
    );
    scale = jasmine.createSpyObj('BluetoothScale', [
      'getWeight',
      'setTimer',
      'tare',
    ]);
    scale.getWeight.and.returnValue(18.26);
    timer = { hasStarted: false, running: false };
    const bleManager = jasmine.createSpyObj('CoffeeBluetoothDevicesService', {
      getScale: withScale ? scale : null,
      getPressureDevice: null,
      getTemperatureDevice: null,
    });
    component = Object.assign(
      Object.create(BrewBrewingGraphComponent.prototype),
      {
        textToSpeech,
        bleManager,
        brewComponent: {
          timer: {
            timer,
            isTimerRunning: () => timer.running,
          },
        },
        platform: { is: () => true },
        translate: { instant: (key: string) => key },
        ngZone: { runOutsideAngular: (run: () => void) => run() } as NgZone,
        uiAlert: jasmine.createSpyObj('UIAlert', {
          showLoadingSpinner: Promise.resolve(),
          hideLoadingSpinner: Promise.resolve(),
        }),
        data: {
          brew_time: 0,
          getPreparation: () => ({
            style_type: PREPARATION_STYLE_TYPE.POUR_OVER,
          }),
        },
        flowProfileTempAll: [],
        settings: {
          language: 'de',
          bluetooth_command_delay: 0,
          text_to_speech_active: true,
          text_to_speech_weight: true,
          text_to_speech_brew_time: true,
          text_to_speech_brew_start_end: false,
          text_to_speech_whole_grams: false,
          text_to_speech_interval_rate: 500,
          ...settings,
        },
      },
    );
    for (const method of [
      'attachToScaleWeightChange',
      'attachToFlowChange',
      'deattachToWeightChange',
      'deattachToFlowChange',
      'deattachToPressureChange',
      'redrawGraph',
      'updateChart',
    ] as const) {
      spyOn(component, method).and.stub();
    }
  }

  const said = () => textToSpeech.speak.calls.allArgs().map(([text]) => text);

  afterEach(() => component.deattachToTextToSpeedChange());

  it('says the scale weight with tenths in the app language', fakeAsync(() => {
    create();

    component.attachToTextToSpeechBeforeStart();
    tick(500);
    scale.getWeight.and.returnValue(18.04);
    tick(500);

    expect(said()).toEqual(['18,3', '18']);
  }));

  it('starts once the scale is connected', fakeAsync(() => {
    create();
    Object.assign(scale, {
      timerEvent: new Subject(),
      tareEvent: new Subject(),
    });
    spyOn(component, 'deattachToScaleEvents').and.stub();
    spyOn(component, 'checkChanges').and.stub();

    void component['__connectSmartScale'](false);
    tick(500);

    expect(said()).toEqual(['18,3']);
  }));

  it('says whole grams when chosen', fakeAsync(() => {
    create({ language: 'en', text_to_speech_whole_grams: true });

    component.attachToTextToSpeechBeforeStart();
    tick(500);

    expect(said()).toEqual(['18']);
  }));

  it('says nothing without a scale or without spoken weight', fakeAsync(() => {
    for (const [settings, withScale] of [
      [{}, false],
      [{ text_to_speech_active: false }, true],
      [{ text_to_speech_weight: false }, true],
    ] as const) {
      create(settings, withScale);

      component.attachToTextToSpeechBeforeStart();
      tick(5000);

      expect(textToSpeech.speak.calls.count())
        .withContext(JSON.stringify({ settings, withScale }))
        .toBe(0);
    }
  }));

  it('says nothing once the brew has started, also while it is paused', fakeAsync(() => {
    create();
    timer.hasStarted = true;

    component.attachToTextToSpeechBeforeStart();
    tick(5000);

    expect(textToSpeech.speak.calls.count()).toBe(0);
  }));

  it('ends at the brew start, which says the brew weight with tenths too', fakeAsync(() => {
    create();
    component.attachToTextToSpeechBeforeStart();
    tick(500);

    void component.timerStarted(undefined);
    timer.hasStarted = true;
    Object.assign(component, { flowProfileTempAll: [{ weight: 31.46 }] });
    tick(1000);

    expect(said()).toEqual(['18,3', '31,5', '31,5']);
  }));

  it('is silent while paused and says the brew weight again on resume', fakeAsync(() => {
    create();
    Object.assign(component, { flowProfileTempAll: [{ weight: 31.46 }] });
    void component.timerStarted(undefined);
    timer.hasStarted = true;
    tick(500);

    void component.timerPaused(undefined);
    tick(1000);
    void component.timerResumed(undefined);
    tick(500);

    expect(said()).toEqual(['31,5', '31,5']);
  }));

  it('starts again after a reset', fakeAsync(() => {
    create();
    void component.timerStarted(undefined);
    timer.hasStarted = true;
    tick(500);
    textToSpeech.speak.calls.reset();

    void component.timerReset(undefined);
    timer.hasStarted = false;
    tick(200);
    tick(500);

    expect(said()).toEqual(['18,3']);
    discardPeriodicTasks();
  }));

  it('ends with the component', fakeAsync(() => {
    create();
    component.attachToTextToSpeechBeforeStart();

    component.ngOnDestroy();
    tick(5000);

    expect(textToSpeech.speak.calls.count()).toBe(0);
  }));
});
