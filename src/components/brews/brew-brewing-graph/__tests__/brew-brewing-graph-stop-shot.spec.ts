import { SanremoStopResult } from '../../../../classes/preparationDevice/sanremo/sanremoYOUDevice';
import { BrewBrewingGraphComponent } from '../brew-brewing-graph.component';

describe('BrewBrewingGraphComponent stop shot', () => {
  let component: any;
  let uiToast: jasmine.SpyObj<any>;
  let device: jasmine.SpyObj<any>;
  let timer: jasmine.SpyObj<any>;

  function setup(stopResult: SanremoStopResult, resend = false) {
    device = jasmine.createSpyObj('Device', ['stopActualShot', 'stopShot']);
    device.stopActualShot.and.callFake((onResend: () => void) => {
      if (resend) {
        onResend();
      }
      return Promise.resolve(stopResult);
    });
    timer = jasmine.createSpyObj('Timer', ['pauseTimer']);
    uiToast = jasmine.createSpyObj('UIToast', ['showInfoToast']);
    component = Object.assign(
      Object.create(BrewBrewingGraphComponent.prototype),
      {
        uiToast,
        uiLog: jasmine.createSpyObj('UILog', ['log', 'error']),
        settings: { bluetooth_scale_espresso_stop_on_no_weight_change: true },
        brewComponent: {
          timer,
          brewBrewingPreparationDeviceEl: { preparationDevice: device },
        },
      },
    );
  }
  const flush = () => new Promise((resolve) => setTimeout(resolve));

  it('shows "shot ended" only after the Sanremo confirmed the stop', async () => {
    setup('confirmed');
    component.triggerStopShotOnSanremoYOU(36);
    expect(uiToast.showInfoToast).not.toHaveBeenCalled();
    await flush();
    expect(uiToast.showInfoToast).toHaveBeenCalledOnceWith(
      'PREPARATION_DEVICE.TYPE_SANREMO_YOU.SHOT_ENDED',
    );
  });

  it('tells the user about a resend and a stop that was not confirmed', async () => {
    setup('failed', true);
    component.triggerStopShotOnSanremoYOU(36);
    await flush();
    expect(uiToast.showInfoToast.calls.allArgs()).toEqual([
      ['PREPARATION_DEVICE.TYPE_SANREMO_YOU.STOP_IGNORED_RESENT'],
      ['PREPARATION_DEVICE.TYPE_SANREMO_YOU.STOP_NOT_CONFIRMED'],
    ]);
  });

  for (const result of ['not_connected', 'connection_lost'] as const) {
    it(`asks to stop on the machine when the stop ends as ${result}`, async () => {
      setup(result);
      component.triggerStopShotOnSanremoYOU(36);
      await flush();
      expect(uiToast.showInfoToast).toHaveBeenCalledOnceWith(
        'PREPARATION_DEVICE.TYPE_SANREMO_YOU.STOP_NOT_CONFIRMED',
      );
    });
  }

  for (const result of ['not_running', 'aborted'] as const) {
    it(`shows nothing when the stop ends as ${result}`, async () => {
      setup(result);
      component.triggerStopShotOnSanremoYOU(36);
      await flush();
      expect(uiToast.showInfoToast).not.toHaveBeenCalled();
    });
  }

  it('confirms a pause stop without "shot ended"', async () => {
    setup('confirmed');
    component.stopShotOnSanremoYOU(device, false);
    await flush();
    expect(uiToast.showInfoToast).not.toHaveBeenCalled();
  });

  it('shows "shot ended" on the Move 2 only after the stop was written', async () => {
    setup('confirmed');
    device.stopShot.and.resolveTo();
    component.triggerStopShotOnMove2(36);
    expect(uiToast.showInfoToast).not.toHaveBeenCalled();
    await flush();
    expect(uiToast.showInfoToast).toHaveBeenCalledOnceWith(
      'PREPARATION_DEVICE.TYPE_MOVE2.SHOT_ENDED',
    );
  });

  it('reports a Move 2 stop that could not be written', async () => {
    setup('confirmed');
    device.stopShot.and.rejectWith(undefined);
    component.triggerStopShotOnMove2(36);
    await flush();
    expect(uiToast.showInfoToast).toHaveBeenCalledOnceWith(
      'PREPARATION_DEVICE.SHOT_STOP_FAILED',
    );
  });
});
