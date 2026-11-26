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
import { GraphHelperService } from '../../../../services/graphHelper/graph-helper.service';
import { UIHelper } from '../../../../services/uiHelper';
import { BrewBrewingGraphComponent } from '../brew-brewing-graph.component';

interface ScaleSample {
  actual: number;
  old: number;
  smoothed: number;
  oldSmoothed: number;
  notMutatedWeight: number;
}

/**
 * Characterises when a running espresso shot is stopped. All readings enter
 * the way devices deliver them (scale, pressure sensor, machine polling), so
 * the graph traces and the stored flow profile hold the same values.
 */
describe('BrewBrewingGraphComponent shot end', () => {
  const SAMPLE_MS = 100;

  let component: BrewBrewingGraphComponent;
  let settings: Settings;
  let preparation: Preparation;
  let data: Brew;
  let timer: {
    running: boolean;
    showDripTimer: boolean;
    isTimerRunning: () => boolean;
    pauseTimer: jasmine.Spy;
    startTimer: jasmine.Spy;
    initTimer: jasmine.Spy;
    checkChanges: jasmine.Spy;
  };
  let prepDeviceEl: {
    preparationDevice: unknown;
    preparationDeviceConnected: jasmine.Spy;
    getPreparationDeviceType: jasmine.Spy;
  };
  let bleManager: {
    getScale: jasmine.Spy;
    getPressureDevice: jasmine.Spy;
  };
  let readInternalJSONFile: jasmine.Spy<(path: string) => Promise<BrewFlow>>;
  let isCapacitor: boolean;
  let shotStart: number;
  let lastWeight: number;

  const scale = {
    flowChange: new Subject<ScaleSample>(),
    supportsTwoWeights: false,
    getWeight: () => 0,
    getScaleType: () => ScaleType.DECENT,
    resetSmoothedValue: () => undefined,
    setDoubleWeight: () => undefined,
    setOldWeight: () => undefined,
    tare: () => undefined,
  };
  const pressureDevice = {
    pressureChange: new Subject<{ actual: number; old: number }>(),
  };

  const internals = () =>
    component as unknown as {
      traces: Record<string, { x: unknown[]; y: number[] }>;
      flow_profile_raw: BrewFlow;
    };

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 0, 1, 8, 0, 0));
    shotStart = Date.now();
    lastWeight = 0;
    isCapacitor = true;
    readInternalJSONFile = jasmine.createSpy('readInternalJSONFile');

    settings = new Settings();
    settings.bluetooth_scale_espresso_stop_on_no_weight_change = true;
    settings.bluetooth_scale_espresso_stop_on_no_weight_change_min_flow = 0.5;
    settings.pressure_threshold_stop_shot_active = true;
    settings.pressure_threshold_stop_shot_bar = 2;

    preparation = new Preparation();
    preparation.style_type = PREPARATION_STYLE_TYPE.ESPRESSO;
    data = new Brew();
    data.config.uuid = 'brew-1';
    data.grind_weight = 18;
    spyOn(data, 'getPreparation').and.returnValue(preparation);

    timer = {
      running: true,
      showDripTimer: false,
      isTimerRunning: () => timer.running,
      pauseTimer: jasmine.createSpy('pauseTimer').and.callFake(() => {
        timer.running = false;
      }),
      startTimer: jasmine.createSpy('startTimer').and.callFake(() => {
        timer.running = true;
      }),
      initTimer: jasmine.createSpy('initTimer'),
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
    bleManager = {
      getScale: jasmine.createSpy('getScale').and.returnValue(scale),
      getPressureDevice: jasmine
        .createSpy('getPressureDevice')
        .and.returnValue(pressureDevice),
    };

    const traces: Record<string, { x: unknown[]; y: number[] }> = {};
    for (const key of [
      'weightTrace',
      'flowPerSecondTrace',
      'realtimeFlowTrace',
      'pressureTrace',
      'temperatureTrace',
      'waterDispensedTrace',
      'waterDispensedFlowSecondTrace',
    ]) {
      traces[key] = { x: [], y: [] };
    }

    component = Object.assign(
      Object.create(BrewBrewingGraphComponent.prototype),
      {
        data,
        settings,
        isEdit: false,
        isDetail: false,
        baristamode: false,
        baristaModeTargetWeight: undefined,
        ignoreScaleWeight: false,
        espressoJustOneCup: false,
        machineStopScriptWasTriggered: false,
        webhookFired: false,
        webhookTargetWeight: 0,
        flow_profile_raw: new BrewFlow(),
        traces,
        flowProfileArr: [],
        flowProfileArrObjs: [],
        flowProfileArrCalculated: [],
        flowProfileTempAll: [],
        flowTime: undefined,
        flowSecondTick: 0,
        flowNCalculation: 0,
        startingFlowTime: shotStart,
        platform: { is: () => isCapacitor },
        bleManager,
        uiHelper: Object.create(UIHelper.prototype),
        graphHelper: Object.create(GraphHelperService.prototype),
        uiFileHelper: { readInternalJSONFile },
        uiAlert: jasmine.createSpyObj('UIAlert', {
          showLoadingSpinner: Promise.resolve(),
          hideLoadingSpinner: Promise.resolve(),
        }),
        uiToast: jasmine.createSpyObj('UIToast', ['showInfoToast']),
        uiLog: jasmine.createSpyObj('UILog', ['log', 'error']),
        ngZone: {
          run: (fn: () => unknown) => fn(),
          runOutsideAngular: (fn: () => unknown) => fn(),
        },
        changeDetectorRef: jasmine.createSpyObj('ChangeDetectorRef', [
          'markForCheck',
          'detectChanges',
        ]),
        brewComponent: {
          timer,
          choosenPreparation: preparation,
          brewBrewingPreparationDeviceEl: prepDeviceEl,
          getTime: () => Math.floor((Date.now() - shotStart) / 1000),
          checkChanges: () => undefined,
        },
      },
    );
    for (const method of [
      'updateChart',
      'checkChanges',
      'setActualSmartInformation',
      'setActualPressureInformation',
      'setActualTemperatureInformation',
      'timerStarted',
      'triggerStopShotOnSanremoYOU',
    ]) {
      Object.assign(component, { [method]: () => undefined });
    }
  });

  afterEach(() => {
    component.deattachToWeightChange();
    component.deattachToPressureChange();
    component.stopFetchingDataFromSanremoYOU();
    component.stopFetchingDataFromMeticulous();
    jasmine.clock().uninstall();
  });

  /** Advances the clock by one reading; the timer shows whole seconds. */
  function nextTick(ms = SAMPLE_MS): void {
    jasmine.clock().tick(ms);
    data.brew_time = Math.floor((Date.now() - shotStart) / 1000);
  }

  function weighEvery(ms: number, weights: number[]): void {
    for (const weight of weights) {
      nextTick(ms);
      scale.flowChange.next({
        actual: weight,
        old: lastWeight,
        smoothed: weight,
        oldSmoothed: lastWeight,
        notMutatedWeight: weight,
      });
      lastWeight = weight;
    }
  }
  const weigh = (...weights: number[]) => weighEvery(SAMPLE_MS, weights);

  function pressEvery(ms: number, bars: number[]): void {
    for (const bar of bars) {
      nextTick(ms);
      pressureDevice.pressureChange.next({ actual: bar, old: bar });
    }
  }
  const press = (...bars: number[]) => pressEvery(SAMPLE_MS, bars);

  const repeat = (value: number, count: number) =>
    Array.from({ length: count }, () => value);
  /** Rising weight, by default 0.2 g per reading (2 g/s at 10 Hz). */
  const rise = (from: number, to: number, step = 0.2) =>
    Array.from(
      { length: Math.round((to - from) / step) },
      (_, i) => Math.round((from + (i + 1) * step) * 10) / 10,
    );

  const shotEnded = () =>
    timer.pauseTimer.calls
      .allArgs()
      .some(([reason]) => reason === 'shot_ended');

  describe('by weight', () => {
    beforeEach(() => component.attachToScaleWeightChange());

    it('stops once the cup reached the dose and the flow has dried up', () => {
      weigh(...repeat(0, 60), ...rise(0, 36));
      expect(shotEnded()).toBeFalse();

      weigh(...repeat(36, 12));

      expect(shotEnded()).toBeTrue();
      expect(data.brew_beverage_quantity).toBe(36);
    });

    it('keeps running while the cup holds less than the dose', () => {
      weigh(...repeat(0, 60), ...rise(0, 16), ...repeat(16, 30));

      expect(shotEnded()).toBeFalse();
    });

    it('keeps running while the flow stays above the minimum flow', () => {
      settings.bluetooth_scale_espresso_stop_on_no_weight_change_min_flow = 0.1;

      weigh(...repeat(0, 60), ...rise(0, 36), 36.1, 36.2, 36.3, 36.4);

      expect(shotEnded()).toBeFalse();
    });

    it('keeps running when stopping on a steady weight is turned off', () => {
      settings.bluetooth_scale_espresso_stop_on_no_weight_change = false;

      weigh(...repeat(0, 60), ...rise(0, 36), ...repeat(36, 12));

      expect(shotEnded()).toBeFalse();
    });

    it('waits for 5 seconds of brew time', () => {
      // A fast scale passes the 50 readings and the dose within 4 s.
      weighEvery(50, [...rise(0, 20, 0.5), ...repeat(20, 40)]);

      expect(data.brew_time).toBeLessThanOrEqual(5);
      expect(shotEnded()).toBeFalse();

      weighEvery(50, repeat(20, 40));

      expect(shotEnded()).toBeTrue();
    });
  });

  describe('in barista mode with a Sanremo YOU', () => {
    let shotData: SanremoShotData;
    let machine: {
      getActualShotData: () => SanremoShotData;
      getResidualLagTime: () => number;
      getResidualLagTimeByProgram: () => number;
      sendActualWeightAndFlowDataToMachine: jasmine.Spy;
      connectToSocket: () => Promise<boolean>;
    };

    beforeEach(() => {
      shotData = new SanremoShotData();
      shotData.groupStatus = 1;
      shotData.statusPhase = 1;
      machine = {
        getActualShotData: () => shotData,
        getResidualLagTime: () => 1,
        getResidualLagTimeByProgram: () => 1,
        sendActualWeightAndFlowDataToMachine: jasmine.createSpy(
          'sendActualWeightAndFlowDataToMachine',
        ),
        connectToSocket: () => Promise.resolve(true),
      };
      data.preparationDeviceBrew = {
        type: PreparationDeviceType.SANREMO_YOU,
        params: {
          selectedMode: SanremoYOUMode.LISTENING_AND_CONTROLLING,
          stopAtWeight: 0,
          stopAtWeightP1: 36,
        },
      };
      prepDeviceEl.preparationDevice = machine;
      prepDeviceEl.preparationDeviceConnected.and.returnValue(true);
      prepDeviceEl.getPreparationDeviceType.and.returnValue(
        PreparationDeviceType.SANREMO_YOU,
      );
      Object.assign(component, { baristamode: true });
      component.attachToScaleWeightChange();
    });

    it('leaves the end to the machine while it is still extracting', () => {
      weigh(...repeat(0, 60), ...rise(0, 33), ...repeat(33, 12));

      expect(shotEnded()).toBeFalse();
    });

    it('stops at 90 % of the program weight when the machine is gone', () => {
      weigh(...repeat(0, 60), ...rise(0, 33));
      prepDeviceEl.preparationDeviceConnected.and.returnValue(false);

      weigh(...repeat(33, 12));

      expect(component.baristaModeTargetWeight).toBe(36);
      expect(shotEnded()).toBeTrue();
    });

    it('keeps running below 90 % of the program weight', () => {
      weigh(...repeat(0, 60), ...rise(0, 32));
      prepDeviceEl.preparationDeviceConnected.and.returnValue(false);

      weigh(...repeat(32, 12));

      expect(shotEnded()).toBeFalse();
    });

    it('sends the latest weight and flow with the program weight', () => {
      weigh(...repeat(0, 60), ...rise(0, 10));

      const raw = internals().flow_profile_raw;
      expect(
        machine.sendActualWeightAndFlowDataToMachine,
      ).toHaveBeenCalledTimes(raw.weight.length);
      expect(
        machine.sendActualWeightAndFlowDataToMachine.calls.mostRecent().args,
      ).toEqual([
        raw.weight[raw.weight.length - 1].actual_weight,
        raw.realtimeFlow[raw.realtimeFlow.length - 1].flow_value,
        36,
      ]);
      expect(
        machine.sendActualWeightAndFlowDataToMachine.calls.mostRecent().args[1],
      ).toBeGreaterThan(1);
    });

    describe('when the machine finishes', () => {
      const pausedBySanremo = () =>
        timer.pauseTimer.calls
          .allArgs()
          .some(([reason]) => reason === 'sanremo_you');

      beforeEach(async () => {
        timer.running = false;
        component.startFetchingDataFromSanremoYOU();
        await Promise.resolve();
      });

      it('stops when the scale was tared at the end of the shot', () => {
        weigh(...repeat(0, 60), ...rise(0, 20));
        // Cup lifted and scale tared while the machine still reports.
        weigh(0.3);
        shotData.statusPhase = 0;
        nextTick();

        expect(pausedBySanremo()).toBeTrue();
      });

      it('stops when the weight dropped below -2 g', () => {
        weigh(...repeat(0, 60), ...rise(0, 20), 10, 0, -2.5);
        shotData.statusPhase = 0;
        nextTick();

        expect(pausedBySanremo()).toBeTrue();
      });

      it('stops when no weight was recorded at all', () => {
        nextTick();
        expect(timer.running).toBeTrue();

        shotData.statusPhase = 0;
        nextTick();

        expect(pausedBySanremo()).toBeTrue();
      });

      it('keeps the timer while the cup still holds the shot', () => {
        weigh(...repeat(0, 60), ...rise(0, 20));
        shotData.statusPhase = 0;
        nextTick();

        expect(pausedBySanremo()).toBeFalse();
      });

      it('keeps the timer when too few weights came in to judge', () => {
        weigh(...rise(0, 6), 0.3);
        shotData.statusPhase = 0;
        nextTick();

        expect(pausedBySanremo()).toBeFalse();
      });
    });
  });

  it('does not send weights to the machine outside barista mode', () => {
    const send = jasmine.createSpy('sendActualWeightAndFlowDataToMachine');
    prepDeviceEl.preparationDevice = {
      sendActualWeightAndFlowDataToMachine: send,
    };
    component.attachToScaleWeightChange();

    weigh(...rise(0, 4));

    expect(send).not.toHaveBeenCalled();
  });

  describe('by pressure without a scale', () => {
    beforeEach(() => {
      bleManager.getScale.and.returnValue(null);
      component.attachToPressureChange();
    });

    it('stops when the pressure falls to the threshold after a shot', () => {
      press(...repeat(9, 110), 5);
      expect(shotEnded()).toBeFalse();

      press(2);

      expect(shotEnded()).toBeTrue();
    });

    it('keeps running while the pressure stays above the threshold', () => {
      press(...repeat(9, 110), 2.1);

      expect(shotEnded()).toBeFalse();
    });

    it('keeps running when the pressure never reached 1 bar', () => {
      press(...repeat(0.5, 120));

      expect(shotEnded()).toBeFalse();
    });

    it('waits for 100 pressure readings', () => {
      // A slow sensor: 99 readings over 20 s.
      pressEvery(200, [...repeat(9, 98), 1]);

      expect(data.brew_time).toBeGreaterThan(10);
      expect(shotEnded()).toBeFalse();

      press(1);

      expect(shotEnded()).toBeTrue();
    });

    it('keeps running when stopping by pressure is turned off', () => {
      settings.pressure_threshold_stop_shot_active = false;

      press(...repeat(9, 110), 1);

      expect(shotEnded()).toBeFalse();
    });

    it('counts the readings of a profile loaded for editing', async () => {
      const stored = new BrewFlow();
      for (let i = 0; i < 99; i++) {
        const time = `08:00:${String(Math.floor(i / 10)).padStart(2, '0')}.${i % 10}00`;
        stored.pressureFlow.push({
          timestamp: time,
          brew_time: `${Math.floor(i / 10)}.${i % 10}`,
          actual_pressure: 9,
          old_pressure: 9,
        });
      }
      readInternalJSONFile.and.resolveTo(stored);
      Object.assign(component, { isEdit: true });
      jasmine.clock().tick(20_000);

      await component.readFlowProfile();
      (
        component as unknown as { graphHelper: GraphHelperService }
      ).graphHelper.fillDataIntoTraces(
        internals().flow_profile_raw,
        internals().traces,
      );
      press(1);

      expect(readInternalJSONFile).toHaveBeenCalledWith(
        'brews/brew-1_flow_profile.json',
      );
      expect(internals().flow_profile_raw.pressureFlow.length).toBe(100);
      expect(shotEnded()).toBeTrue();
    });
  });

  it('ignores the pressure for the shot end while a scale is connected', () => {
    component.attachToPressureChange();

    press(...repeat(9, 110), 1);

    expect(shotEnded()).toBeFalse();
  });

  describe('with a Meticulous', () => {
    let shotData: MeticulousShotData;

    beforeEach(async () => {
      bleManager.getScale.and.returnValue(null);
      shotData = new MeticulousShotData();
      prepDeviceEl.preparationDevice = {
        getActualShotData: () => shotData,
        connectToSocket: () => Promise.resolve(true),
      };
      prepDeviceEl.preparationDeviceConnected.and.returnValue(true);
      prepDeviceEl.getPreparationDeviceType.and.returnValue(
        PreparationDeviceType.METICULOUS,
      );
      timer.running = false;
      component.startFetchingDataFromMeticulous();
      await Promise.resolve();
      shotData.extracting = true;
    });

    function extract(weights: number[], gravimetricFlow: number | null): void {
      for (const weight of weights) {
        shotData.oldWeight = shotData.weight;
        shotData.oldSmoothedWeight = shotData.smoothedWeight;
        shotData.weight = weight;
        shotData.smoothedWeight = weight;
        shotData.pressure = 9;
        shotData.gravimetric_flow = gravimetricFlow;
        nextTick();
      }
    }

    const lastFlow = () => {
      const { realtimeFlow } = internals().flow_profile_raw;
      return realtimeFlow[realtimeFlow.length - 1].flow_value;
    };
    const lastFlowTrace = () => {
      const { y } = internals().traces.realtimeFlowTrace;
      return y[y.length - 1];
    };

    it('takes the flow measured by the machine', () => {
      extract(rise(0, 4), 3.7);

      expect(lastFlow()).toBe(3.7);
      expect(lastFlowTrace()).toBe(3.7);
    });

    it('keeps the flow from the weight when the machine reports none', () => {
      extract(rise(0, 4), 0);

      expect(lastFlow()).toBeCloseTo(2, 0);
      expect(lastFlowTrace()).toBe(lastFlow());
    });

    it('keeps the flow from the weight without a machine flow', () => {
      extract(rise(0, 4), null);

      expect(lastFlow()).toBeCloseTo(2, 0);
    });
  });
});
