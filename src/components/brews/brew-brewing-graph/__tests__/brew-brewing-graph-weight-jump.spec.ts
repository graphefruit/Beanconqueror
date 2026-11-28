import { PREPARATION_STYLE_TYPE } from '../../../../enums/preparations/preparationStyleTypes';
import { UIHelper } from '../../../../services/uiHelper';
import { BrewBrewingGraphComponent } from '../brew-brewing-graph.component';

describe('BrewBrewingGraphComponent espresso weight jumps', () => {
  let component: BrewBrewingGraphComponent;
  let scale: jasmine.SpyObj<{
    setOldWeight: (weight: number) => void;
    resetSmoothedValue: () => void;
    getScaleType: () => string;
  }>;

  beforeEach(() => {
    scale = jasmine.createSpyObj('BluetoothScale', [
      'setOldWeight',
      'resetSmoothedValue',
      'getScaleType',
    ]);
    component = Object.assign(
      Object.create(BrewBrewingGraphComponent.prototype),
      {
        uiHelper: Object.create(UIHelper.prototype),
        bleManager: { getScale: () => scale },
        baristamode: false,
        flowProfileTempAll: [{ weight: 18 }, { weight: 20 }],
      },
    );
  });

  /** Gives each reading to the filter and records it as the graph does. */
  function record(readings: number[]): number[] {
    return readings.map((actual) => {
      const { actual: weight } = component['mutateWeightAndSeeAnomalys'](
        {
          actual,
          old: 0,
          smoothed: actual,
          oldSmoothed: 0,
          notMutatedWeight: actual,
        },
        scale as never,
        PREPARATION_STYLE_TYPE.ESPRESSO,
      );
      component['flowProfileTempAll'].push({ weight });
      return weight;
    });
  }

  it('records a cup put on at once after it held for three readings', () => {
    expect(record([40, 40.2, 40.5, 41])).toEqual([20, 20, 40.5, 41]);
  });

  it('still ignores a single spike', () => {
    expect(record([259, 21, 22])).toEqual([20, 21, 22]);
  });

  it('forgets a held back jump when the graph is reset', async () => {
    record([40, 40.2]);
    const bleManager = component['bleManager'];
    Object.assign(component, {
      bleManager: {
        getScale: () => null,
        getPressureDevice: () => null,
        getTemperatureDevice: () => null,
      },
      flow_profile_raw: { weight: [20], pressureFlow: [], temperatureFlow: [] },
      uiAlert: jasmine.createSpyObj('UIAlert', {
        showLoadingSpinner: Promise.resolve(),
        hideLoadingSpinner: Promise.resolve(),
      }),
    });
    spyOn(component, 'redrawGraph').and.stub();

    await component.timerReset(undefined);
    Object.assign(component, {
      bleManager,
      flowProfileTempAll: [{ weight: 18 }, { weight: 20 }],
    });

    // Without the reset this would be the third reading of the jump.
    expect(record([40.4])).toEqual([20]);
  });
});
