import { Subject } from 'rxjs';

import { Brew } from '../../../../classes/brew/brew';
import { BrewFlow } from '../../../../classes/brew/brewFlow';
import { ScaleType } from '../../../../classes/devices/types';
import { Preparation } from '../../../../classes/preparation/preparation';
import { PreparationDeviceType } from '../../../../classes/preparationDevice';
import { MeticulousShotData } from '../../../../classes/preparationDevice/meticulous/meticulousShotData';
import { SanremoShotData } from '../../../../classes/preparationDevice/sanremo/sanremoShotData';
import { Settings } from '../../../../classes/settings/settings';
import { SanremoYOUMode } from '../../../../enums/preparationDevice/sanremo/sanremoYOUMode';
import { PREPARATION_STYLE_TYPE } from '../../../../enums/preparations/preparationStyleTypes';
import { UIHelper } from '../../../../services/uiHelper';
import { FlowSeriesBuffer } from '../../graph/flow-series-buffer';
import { BrewBrewingGraphComponent } from '../brew-brewing-graph.component';

/**
 * The shot end rules read the measured series only: every case runs
 * without a drawn graph.
 */
describe('BrewBrewingGraphComponent shot end without the drawn graph', () => {
  let component: BrewBrewingGraphComponent;
  let raw: BrewFlow;
  let settings: Settings;
  let data: Brew;
  let timer: {
    running: boolean;
    isTimerRunning: () => boolean;
    pauseTimer: jasmine.Spy;
    initTimer: jasmine.Spy;
    startTimer: jasmine.Spy;
    checkChanges: jasmine.Spy;
  };
  let prepDeviceEl: {
    preparationDevice: unknown;
    preparationDeviceConnected: jasmine.Spy;
    getPreparationDeviceType: jasmine.Spy;
  };
  const scale = {
    flowChange: new Subject<unknown>(),
    supportsTwoWeights: false,
    getScaleType: () => ScaleType.DECENT,
    setDoubleWeight: () => undefined,
    getWeight: () => 0,
    tare: () => undefined,
    resetSmoothedValue: () => undefined,
  };

  const rule = (name: string): boolean =>
    (component as unknown as Record<string, () => boolean>)[name]();

  function measure(weights: number[], flows: number[]): void {
    weights.forEach((w) =>
      raw.weight.push({ actual_weight: w } as BrewFlow['weight'][number]),
    );
    flows.forEach((f) =>
      raw.realtimeFlow.push({
        flow_value: f,
      } as BrewFlow['realtimeFlow'][number]),
    );
  }

  beforeEach(() => {
    jasmine.clock().install();
    settings = new Settings();
    settings.bluetooth_scale_espresso_stop_on_no_weight_change = true;
    settings.bluetooth_scale_espresso_stop_on_no_weight_change_min_flow = 0.5;
    settings.pressure_threshold_stop_shot_active = true;
    settings.pressure_threshold_stop_shot_bar = 2;
    const preparation = new Preparation();
    preparation.style_type = PREPARATION_STYLE_TYPE.ESPRESSO;
    data = new Brew();
    data.grind_weight = 18;
    data.brew_time = 30;
    spyOn(data, 'getPreparation').and.returnValue(preparation);
    raw = new BrewFlow();
    timer = {
      running: true,
      isTimerRunning: () => timer.running,
      pauseTimer: jasmine.createSpy('pauseTimer'),
      initTimer: jasmine.createSpy('initTimer'),
      startTimer: jasmine.createSpy('startTimer'),
      checkChanges: jasmine.createSpy('checkChanges'),
    };
    prepDeviceEl = {
      preparationDevice: undefined,
      preparationDeviceConnected: jasmine
        .createSpy('preparationDeviceConnected')
        .and.returnValue(false),
      getPreparationDeviceType: jasmine
        .createSpy('getPreparationDeviceType')
        .and.returnValue(PreparationDeviceType.NONE),
    };
    component = Object.assign(
      Object.create(BrewBrewingGraphComponent.prototype),
      {
        data,
        settings,
        baristamode: false,
        baristaModeTargetWeight: undefined,
        ignoreScaleWeight: true,
        espressoJustOneCup: false,
        flow_profile_raw: raw,
        liveBuffer: new FlowSeriesBuffer(),
        flowProfileTempAll: [],
        uiHelper: Object.create(UIHelper.prototype),
        uiLog: jasmine.createSpyObj('UILog', ['log', 'error']),
        uiAlert: jasmine.createSpyObj('UIAlert', {
          showLoadingSpinner: Promise.resolve(),
          hideLoadingSpinner: Promise.resolve(),
        }),
        platform: { is: () => true },
        uiToast: jasmine.createSpyObj('UIToast', ['showInfoToast']),
        bleManager: { getScale: () => scale },
        ngZone: { runOutsideAngular: (fn: () => unknown) => fn() },
        changeDetectorRef: jasmine.createSpyObj('ChangeDetectorRef', [
          'detectChanges',
          'markForCheck',
        ]),
        brewComponent: {
          timer,
          brewBrewingPreparationDeviceEl: prepDeviceEl,
        },
      },
    );
    for (const method of [
      '__setFlowProfile',
      '__setPressureFlow',
      '__setTemperatureFlow',
      '__setWaterDispensedFlow',
      '__setWaterDispensedFlowSecond',
      '__setScaleWeight',
      'setActualSmartInformation',
      'updateChart',
      'timerStarted',
    ]) {
      Object.assign(component, { [method]: () => undefined });
    }
  });

  afterEach(() => {
    component.deattachToWeightChange();
    component.stopFetchingDataFromSanremoYOU();
    component.stopFetchingDataFromMeticulous();
    jasmine.clock().uninstall();
  });

  it('ends by weight', () => {
    measure(
      Array.from({ length: 50 }, (_, i) => i),
      [...Array.from({ length: 49 }, () => 2), 0.2],
    );

    expect(rule('hasEspressoShotEnded')).toBeTrue();
  });

  it('ends by pressure', () => {
    for (const bar of [...Array.from({ length: 99 }, () => 9), 1]) {
      raw.pressureFlow.push({
        actual_pressure: bar,
      } as BrewFlow['pressureFlow'][number]);
    }

    expect(rule('hasEspressoShotEndedWithPressure')).toBeTrue();
  });

  describe('with a Sanremo YOU in barista mode', () => {
    let shotData: SanremoShotData;
    let send: jasmine.Spy;

    beforeEach(() => {
      shotData = new SanremoShotData();
      shotData.groupStatus = 1;
      shotData.statusPhase = 1;
      send = jasmine.createSpy('sendActualWeightAndFlowDataToMachine');
      prepDeviceEl.preparationDevice = {
        getActualShotData: () => shotData,
        getResidualLagTime: () => 1,
        sendActualWeightAndFlowDataToMachine: send,
        connectToSocket: () => Promise.resolve(true),
      };
      prepDeviceEl.preparationDeviceConnected.and.returnValue(true);
      prepDeviceEl.getPreparationDeviceType.and.returnValue(
        PreparationDeviceType.SANREMO_YOU,
      );
      data.preparationDeviceBrew = {
        type: PreparationDeviceType.SANREMO_YOU,
        params: {
          selectedMode: SanremoYOUMode.LISTENING_AND_CONTROLLING,
          stopAtWeight: 0,
        },
      };
      Object.assign(component, { baristamode: true });
    });

    it('sends the latest weight and flow to the machine', () => {
      measure([1, 2.4], [1, 3.1]);
      component.attachToScaleWeightChange();
      // The machine program weight is not part of this rule.
      timer.running = false;

      scale.flowChange.next({ actual: 2.4, old: 2.4 });

      expect(send).toHaveBeenCalledOnceWith(2.4, 3.1, undefined);
    });

    it('stops the timer when the scale was tared at the end', async () => {
      measure([...Array.from({ length: 40 }, () => 20), 0.3], []);
      timer.running = false;
      component.startFetchingDataFromSanremoYOU();
      await Promise.resolve();
      jasmine.clock().tick(100);
      timer.running = true;

      shotData.statusPhase = 0;
      jasmine.clock().tick(100);

      expect(timer.pauseTimer).toHaveBeenCalledWith('sanremo_you');
    });
  });

  it('writes the flow of a Meticulous into the measured series', async () => {
    const shotData = new MeticulousShotData();
    prepDeviceEl.preparationDevice = {
      getActualShotData: () => shotData,
      connectToSocket: () => Promise.resolve(true),
    };
    prepDeviceEl.preparationDeviceConnected.and.returnValue(true);
    prepDeviceEl.getPreparationDeviceType.and.returnValue(
      PreparationDeviceType.METICULOUS,
    );
    measure([4], [2]);
    component.startFetchingDataFromMeticulous();
    await Promise.resolve();

    shotData.extracting = true;
    shotData.gravimetric_flow = 3.7;
    jasmine.clock().tick(100);

    expect(raw.realtimeFlow[0].flow_value).toBe(3.7);
  });
});
