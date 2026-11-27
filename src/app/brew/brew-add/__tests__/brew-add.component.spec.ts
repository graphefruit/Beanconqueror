import { BrewAddComponent } from '../brew-add.component';

describe('BrewAddComponent VoiceOver Magic Tap', () => {
  let component: BrewAddComponent;
  let timer: jasmine.SpyObj<any>;
  let brewing: jasmine.SpyObj<any>;
  let modal: HTMLElement;
  let textToSpeech: jasmine.SpyObj<any>;
  let scale: { getWeight: jasmine.Spy } | null;

  beforeEach(() => {
    const element = document.createElement('brew-add');
    modal = document.createElement('ion-modal');
    modal.appendChild(element);
    timer = jasmine.createSpyObj('timer', [
      'isTimerRunning',
      'getSeconds',
      'getMilliseconds',
      'resetWithoutEmit',
      'pauseTimer',
    ]);
    timer.isTimerRunning.and.returnValue(false);
    timer.getSeconds.and.returnValue(0);
    timer.getMilliseconds.and.returnValue(0);
    brewing = jasmine.createSpyObj('brewing', [
      'timerReset',
      'timerStartPressed',
    ]);
    brewing.timer = timer;
    brewing.brewBrewingGraphEl = {
      flow_profile_raw: { weight: [], pressureFlow: [], temperatureFlow: [] },
    };
    brewing.timerReset.and.resolveTo();
    brewing.timerStartPressed.and.callFake(() => {
      timer.isTimerRunning.and.returnValue(true);
      return Promise.resolve();
    });
    textToSpeech = jasmine.createSpyObj('textToSpeech', ['speakInFull']);
    scale = null;
    component = Object.assign(Object.create(BrewAddComponent.prototype), {
      magicTapActive: true,
      magicTapBusy: false,
      elementRef: { nativeElement: element },
      modalController: { getTop: () => Promise.resolve(modal) },
      brewBrewing: brewing,
      textToSpeech,
      translate: {
        instant: (key: string, params?: Record<string, string>) =>
          [key, ...Object.values(params ?? {})].join(' '),
      },
      settings: { language: 'de', text_to_speech_whole_grams: false },
      bleManager: { getScale: () => scale },
    });
  });

  it('uses the normal start path for a zero-time timer', async () => {
    await component.handleVoiceOverMagicTap();

    expect(brewing.timerStartPressed).toHaveBeenCalledOnceWith(undefined);
    expect(timer.resetWithoutEmit).not.toHaveBeenCalled();
    expect(brewing.timerReset).not.toHaveBeenCalled();
  });

  it('awaits reset before starting a previously used timer', async () => {
    timer.getSeconds.and.returnValue(42);
    let finishReset: () => void;
    brewing.timerReset.and.returnValue(
      new Promise<void>((resolve) => {
        finishReset = resolve;
      }),
    );

    const action = component.handleVoiceOverMagicTap();
    await Promise.resolve();

    expect(timer.resetWithoutEmit).toHaveBeenCalledOnceWith();
    expect(brewing.timerReset).toHaveBeenCalledOnceWith(undefined);
    expect(brewing.timerStartPressed).not.toHaveBeenCalled();
    finishReset();
    await action;
    expect(brewing.timerStartPressed).toHaveBeenCalledOnceWith(undefined);
  });

  it('also resets a timer with only milliseconds', async () => {
    timer.getMilliseconds.and.returnValue(250);

    await component.handleVoiceOverMagicTap();

    expect(timer.resetWithoutEmit).toHaveBeenCalledOnceWith();
    expect(brewing.timerReset).toHaveBeenCalledOnceWith(undefined);
    expect(brewing.timerStartPressed).toHaveBeenCalledOnceWith(undefined);
  });

  it('stops a running timer and says when', async () => {
    timer.isTimerRunning.and.returnValue(true);
    timer.getSeconds.and.returnValue(42);

    await component.handleVoiceOverMagicTap();

    expect(timer.pauseTimer).toHaveBeenCalledOnceWith('click');
    expect(timer.resetWithoutEmit).not.toHaveBeenCalled();
    expect(brewing.timerStartPressed).not.toHaveBeenCalled();
    expect(textToSpeech.speakInFull).toHaveBeenCalledOnceWith(
      'TEXT_TO_SPEECH.MAGIC_TAP_STOPPED 0:42',
    );
  });

  it('says the weight with tenths when a scale is connected', async () => {
    timer.isTimerRunning.and.returnValue(true);
    timer.getSeconds.and.returnValue(42);
    scale = { getWeight: jasmine.createSpy().and.returnValue(18.34) };

    await component.handleVoiceOverMagicTap();

    expect(textToSpeech.speakInFull).toHaveBeenCalledOnceWith(
      'TEXT_TO_SPEECH.MAGIC_TAP_STOPPED_WITH_WEIGHT 0:42 18,3',
    );
  });

  it('says whole grams at the stop when they are chosen', async () => {
    timer.isTimerRunning.and.returnValue(true);
    timer.getSeconds.and.returnValue(42);
    scale = { getWeight: jasmine.createSpy().and.returnValue(36.6) };
    component.settings.text_to_speech_whole_grams = true;

    await component.handleVoiceOverMagicTap();

    expect(textToSpeech.speakInFull).toHaveBeenCalledOnceWith(
      'TEXT_TO_SPEECH.MAGIC_TAP_STOPPED_WITH_WEIGHT 0:42 37',
    );
  });

  it('leaves out a weight the scale cannot give', async () => {
    timer.isTimerRunning.and.returnValue(true);
    scale = { getWeight: jasmine.createSpy().and.throwError('gone') };

    await component.handleVoiceOverMagicTap();

    expect(timer.pauseTimer).toHaveBeenCalledTimes(1);
    expect(textToSpeech.speakInFull).toHaveBeenCalledOnceWith(
      'TEXT_TO_SPEECH.MAGIC_TAP_STOPPED 0:00',
    );
  });

  it('says that the brew started', async () => {
    await component.handleVoiceOverMagicTap();

    expect(textToSpeech.speakInFull).toHaveBeenCalledOnceWith(
      'TEXT_TO_SPEECH.MAGIC_TAP_STARTED',
    );
  });

  it('resets a graph with values and says so', async () => {
    brewing.brewBrewingGraphEl.flow_profile_raw.weight = [{}, {}];

    await component.handleVoiceOverMagicTap();

    expect(timer.resetWithoutEmit).toHaveBeenCalledOnceWith();
    expect(brewing.timerReset).toHaveBeenCalledOnceWith(undefined);
    expect(textToSpeech.speakInFull).toHaveBeenCalledOnceWith(
      'TEXT_TO_SPEECH.MAGIC_TAP_RESET_AND_STARTED',
    );
  });

  it('says nothing when the timer did not start', async () => {
    brewing.timerStartPressed.and.resolveTo();

    await component.handleVoiceOverMagicTap();

    expect(textToSpeech.speakInFull).not.toHaveBeenCalled();
  });

  it('ignores repeated gestures while a start is pending', async () => {
    await Promise.all([
      component.handleVoiceOverMagicTap(),
      component.handleVoiceOverMagicTap(),
    ]);

    expect(brewing.timerStartPressed).toHaveBeenCalledTimes(1);
  });

  it('does not start behind another modal', async () => {
    modal.replaceChildren(document.createElement('div'));

    await component.handleVoiceOverMagicTap();

    expect(brewing.timerStartPressed).not.toHaveBeenCalled();
  });

  it('does not start behind an alert', async () => {
    const alert = document.createElement('div');
    spyOn(document, 'querySelectorAll').and.returnValue([alert] as any);

    await component.handleVoiceOverMagicTap();

    expect(brewing.timerStartPressed).not.toHaveBeenCalled();
  });

  it('does not start after leaving the brew-add view', async () => {
    const action = component.handleVoiceOverMagicTap();
    Object.assign(component, { magicTapActive: false });
    await action;

    expect(brewing.timerStartPressed).not.toHaveBeenCalled();
  });

  it('releases the busy guard when starting fails', async () => {
    const error = new Error('start failed');
    brewing.timerStartPressed.and.rejectWith(error);
    await expectAsync(component.handleVoiceOverMagicTap()).toBeRejectedWith(
      error,
    );
    brewing.timerStartPressed.and.resolveTo();

    await component.handleVoiceOverMagicTap();

    expect(brewing.timerStartPressed).toHaveBeenCalledTimes(2);
  });
});
