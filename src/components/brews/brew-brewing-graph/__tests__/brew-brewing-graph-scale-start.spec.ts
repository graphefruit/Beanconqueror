import { Subject } from 'rxjs';

import { SCALE_TIMER_COMMAND } from '../../../../classes/devices';
import { BrewBrewingComponent } from '../../brew-brewing/brew-brewing.component';
import { BrewBrewingGraphComponent } from '../brew-brewing-graph.component';

describe('BrewBrewingGraphComponent start button of the scale', () => {
  let graph: BrewBrewingGraphComponent;
  let brewing: BrewBrewingComponent;
  let timerEvent: Subject<unknown>;
  let scale: { timerEvent: Subject<unknown>; setTimer: jasmine.Spy };
  let timer: {
    timer: { hasStarted: boolean };
    running: boolean;
    isTimerRunning: () => boolean;
    startTimer: jasmine.Spy;
    resumeTimer: jasmine.Spy;
  };
  let speech: jasmine.Spy;
  let recording: jasmine.Spy;
  let uiAlert: jasmine.SpyObj<{
    showLoadingSpinner: () => Promise<void>;
    hideLoadingSpinner: () => Promise<void>;
    showMessage: () => Promise<void>;
  }>;

  const settle = () => new Promise((resolve) => setTimeout(resolve));
  const press = (command?: SCALE_TIMER_COMMAND) =>
    timerEvent.next(command === undefined ? undefined : { command });

  beforeEach(async () => {
    timerEvent = new Subject();
    scale = {
      timerEvent,
      setTimer: jasmine.createSpy('setTimer'),
    };
    Object.assign(scale, { tareEvent: new Subject(), tare: () => undefined });
    timer = {
      timer: { hasStarted: false },
      running: false,
      isTimerRunning: () => timer.running,
      startTimer: jasmine.createSpy('startTimer').and.callFake(() => {
        timer.running = true;
        timer.timer.hasStarted = true;
      }),
      resumeTimer: jasmine.createSpy('resumeTimer').and.callFake(() => {
        timer.running = true;
      }),
    };
    speech = jasmine.createSpy('speakInFull');
    uiAlert = jasmine.createSpyObj('UIAlert', {
      showLoadingSpinner: Promise.resolve(),
      hideLoadingSpinner: Promise.resolve(),
      showMessage: Promise.resolve(),
    });
    const settings = {
      text_to_speech_active: true,
      text_to_speech_brew_start_end: true,
      bluetooth_scale_tare_on_start_timer: true,
      brew_timer_start_delay_active: true,
      brew_timer_start_delay_time: 3,
    };
    brewing = Object.assign(Object.create(BrewBrewingComponent.prototype), {
      data: { brew_time: 0 },
      settings,
      timer,
      uiAlert,
    });
    graph = Object.assign(Object.create(BrewBrewingGraphComponent.prototype), {
      brewComponent: brewing,
      bleManager: {
        getScale: () => scale,
        getPressureDevice: () => null,
        getTemperatureDevice: () => null,
      },
      data: { brew_beverage_quantity: 0, brew_time: 0 },
      settings,
      platform: { is: () => true },
      textToSpeech: { speakInFull: speech },
      translate: { instant: (key: string) => key },
      uiAlert,
      webhookFired: true,
    });
    Object.assign(brewing, { brewBrewingGraphEl: graph });
    spyOn(brewing, 'checkChanges').and.stub();
    for (const method of [
      'deattachToWeightChange',
      'deattachToScaleEvents',
      'attachToFlowChange',
      'attachToTextToSpeechChange',
      'updateChart',
      'checkChanges',
    ] as const) {
      spyOn(graph, method).and.stub();
    }
    recording = spyOn(graph, 'attachToScaleWeightChange').and.stub();
    await graph['__connectSmartScale'](false);
  });

  afterEach(() => graph.deattachToTextToSpeedChange());

  it('records and announces the brew like the start button of the app', async () => {
    press(SCALE_TIMER_COMMAND.START);
    await settle();

    expect(recording).toHaveBeenCalledTimes(1);
    expect(speech).toHaveBeenCalledOnceWith('TEXT_TO_SPEECH.BREW_STARTED');
    expect(graph['webhookFired']).toBeFalse();
    expect(timer.startTimer).toHaveBeenCalledTimes(1);
  });

  it('starts at once and leaves the scale alone, its timer runs already', async () => {
    press(SCALE_TIMER_COMMAND.START);
    await settle();

    // Neither the start delay nor taring holds the timer back.
    expect(uiAlert.showLoadingSpinner).not.toHaveBeenCalled();
    expect(scale.setTimer).not.toHaveBeenCalled();
  });

  it('starts as well when the scale does not say which button it was', async () => {
    press();
    await settle();

    expect(recording).toHaveBeenCalledTimes(1);
    expect(timer.startTimer).toHaveBeenCalledTimes(1);
  });

  it('records again when the scale resumes the brew', async () => {
    timer.timer.hasStarted = true;

    press(SCALE_TIMER_COMMAND.START);
    await settle();

    expect(timer.resumeTimer).toHaveBeenCalledTimes(1);
    expect(timer.startTimer).not.toHaveBeenCalled();
    expect(recording).toHaveBeenCalledTimes(1);
    expect(scale.setTimer).not.toHaveBeenCalled();
  });

  it('ignores the start the scale reports back after the app started', async () => {
    Object.assign(brewing.settings, { brew_timer_start_delay_active: false });
    await brewing.timerStartPressed(undefined);

    press(SCALE_TIMER_COMMAND.START);
    await settle();

    expect(scale.setTimer).toHaveBeenCalledOnceWith(SCALE_TIMER_COMMAND.START);
    expect(timer.startTimer).toHaveBeenCalledTimes(1);
    expect(recording).toHaveBeenCalledTimes(1);
  });

  it('starts once when the scale is pressed while the app still starts', async () => {
    let finishTaring: () => void;
    const appTaring = spyOn(graph, 'timerStartPressed').and.returnValue(
      new Promise<void>((resolve) => (finishTaring = resolve)),
    );
    Object.assign(brewing.settings, { brew_timer_start_delay_active: false });
    const appStart = brewing.timerStartPressed(undefined);

    press(SCALE_TIMER_COMMAND.START);
    await settle();
    finishTaring();
    await appStart;

    expect(appTaring).toHaveBeenCalledTimes(1);
    expect(timer.startTimer).toHaveBeenCalledTimes(1);
    expect(recording).toHaveBeenCalledTimes(1);
  });

  it('can start again once a start has finished', async () => {
    Object.assign(brewing.settings, { brew_timer_start_delay_active: false });
    await brewing.timerStartPressed(undefined);
    timer.running = false;
    timer.timer.hasStarted = false;

    await brewing.timerStartPressed(undefined);

    expect(timer.startTimer).toHaveBeenCalledTimes(2);
  });
});
