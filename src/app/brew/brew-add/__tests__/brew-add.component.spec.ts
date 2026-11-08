import { BrewAddComponent } from '../brew-add.component';

describe('BrewAddComponent VoiceOver Magic Tap', () => {
  let component: BrewAddComponent;
  let timer: jasmine.SpyObj<any>;
  let brewing: jasmine.SpyObj<any>;
  let modal: HTMLElement;

  beforeEach(() => {
    const element = document.createElement('brew-add');
    modal = document.createElement('ion-modal');
    modal.appendChild(element);
    timer = jasmine.createSpyObj('timer', [
      'isTimerRunning',
      'getSeconds',
      'getMilliseconds',
      'resetWithoutEmit',
    ]);
    timer.isTimerRunning.and.returnValue(false);
    timer.getSeconds.and.returnValue(0);
    timer.getMilliseconds.and.returnValue(0);
    brewing = jasmine.createSpyObj('brewing', [
      'timerReset',
      'timerStartPressed',
    ]);
    brewing.timer = timer;
    brewing.timerReset.and.resolveTo();
    brewing.timerStartPressed.and.resolveTo();
    component = Object.assign(Object.create(BrewAddComponent.prototype), {
      magicTapActive: true,
      magicTapBusy: false,
      elementRef: { nativeElement: element },
      modalController: { getTop: () => Promise.resolve(modal) },
      brewBrewing: brewing,
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

  it('does not restart a running timer', async () => {
    timer.isTimerRunning.and.returnValue(true);

    await component.handleVoiceOverMagicTap();

    expect(timer.resetWithoutEmit).not.toHaveBeenCalled();
    expect(brewing.timerStartPressed).not.toHaveBeenCalled();
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
