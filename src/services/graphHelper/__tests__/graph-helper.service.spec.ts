import { TestBed } from '@angular/core/testing';

import { Platform } from '@ionic/angular/standalone';

import { TranslateService } from '@ngx-translate/core';

import { Settings } from '../../../classes/settings/settings';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { CoffeeBluetoothDevicesService } from '../../coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { ThemeService } from '../../theme/theme.service';
import { UISettingsStorage } from '../../uiSettingsStorage';
import {
  expandLiveAxisRangeForSample,
  GraphHelperService,
} from '../graph-helper.service';

describe('GraphHelperService axis fitting', () => {
  let service: GraphHelperService;

  beforeEach(() => {
    service = buildService();
  });

  it('lets the water axis grow past the default to hold the whole pour', () => {
    const traces = filledTraces(service);
    traces.waterDispensedTrace.y = [0, 120, 260, 312];

    const layout = layoutFor(service, traces, true);

    expect(layout['yaxis6'].range[0]).toBe(0);
    expect(layout['yaxis6'].range[1]).toBeGreaterThanOrEqual(312);
  });

  it('keeps the default water axis when a brew stays well inside it', () => {
    const traces = filledTraces(service);
    traces.waterDispensedTrace.y = [0, 12, 40];

    const layout = layoutFor(service, traces, true);

    expect(layout['yaxis6'].range).toEqual([0, 100]);
  });

  it('keeps the default water axis when nothing was dispensed', () => {
    const traces = filledTraces(service);

    const layout = layoutFor(service, traces, true);

    expect(layout['yaxis6'].range).toEqual([0, 100]);
  });

  it('lets a higher reference water trace grow the water axis', () => {
    const traces = filledTraces(service);
    const traceReferences = filledTraces(service);
    traces.waterDispensedTrace.y = [0, 40, 80];
    traceReferences.waterDispensedTrace.y = [0, 120, 180];

    const layout = layoutFor(service, traces, true, traceReferences);

    expect(layout['yaxis6'].range[1]).toBeGreaterThanOrEqual(180);
  });

  it('does not let a lower reference water trace shrink the water axis', () => {
    const traces = filledTraces(service);
    const traceReferences = filledTraces(service);
    traces.waterDispensedTrace.y = [0, 160, 260];
    traceReferences.waterDispensedTrace.y = [0, 40, 80];

    const layout = layoutFor(service, traces, true, traceReferences);
    const activeOnlyLayout = layoutFor(service, traces, true);

    expect(layout['yaxis6'].range).toEqual(activeOnlyLayout['yaxis6'].range);
  });

  it('keeps the default water axis when active and reference traces both fit', () => {
    const traces = filledTraces(service);
    const traceReferences = filledTraces(service);
    traces.waterDispensedTrace.y = [0, 40, 60];
    traceReferences.waterDispensedTrace.y = [0, 70, 90];

    const layout = layoutFor(service, traces, true, traceReferences);

    expect(layout['yaxis6'].range).toEqual([0, 100]);
  });

  it('keeps the existing water axis behavior without reference traces', () => {
    const traces = filledTraces(service);
    traces.waterDispensedTrace.y = [0, 120, 260];

    const layout = layoutFor(service, traces, true, undefined);
    const activeOnlyLayout = layoutFor(service, traces, true);

    expect(layout['yaxis6'].range).toEqual(activeOnlyLayout['yaxis6'].range);
  });

  it('fits a custom axis around its own values rather than around zero', () => {
    const traces = filledTraces(service);
    traces.customTraces = {
      targetTemperature: customTrace([88, 93, 90]),
    };

    const layout = layoutFor(service, traces, true);
    const range = layout['yaxis11'].range;

    expect(range[0]).toBeGreaterThan(80);
    expect(range[0]).toBeLessThan(88);
    expect(range[1]).toBeGreaterThan(93);
  });

  it('pins live custom axes to zero while detail keeps the fitted lower bound', () => {
    const traces = filledTraces(service);
    traces.customTraces = {
      targetTemperature: customTrace([88, 93, 90]),
    };

    const liveLayout = layoutFor(service, traces, false);
    const detailLayout = layoutFor(service, traces, true);

    expect(liveLayout['yaxis11'].range[0]).toBe(0);
    expect(liveLayout['yaxis11'].range[1]).toBe(
      detailLayout['yaxis11'].range[1],
    );
    expect(detailLayout['yaxis11'].range[0]).toBeGreaterThan(80);
    expect(detailLayout['yaxis11'].range[0]).toBeLessThan(88);
  });

  it('fits a custom axis around reference values on the same axis', () => {
    const traces = filledTraces(service);
    const traceReferences = filledTraces(service);
    traces.customTraces = {
      targetTemperature: customTrace([88, 93, 90]),
    };
    traceReferences.customTraces = {
      targetTemperature: customTrace([96, 99, 97]),
    };

    const layout = layoutFor(service, traces, true, traceReferences);
    const range = layout['yaxis11'].range;

    expect(range[0]).toBeLessThan(88);
    expect(range[1]).toBeGreaterThan(99);
  });

  it('fits a custom axis around reference values from the same key on a different axis', () => {
    const traces = filledTraces(service);
    const traceReferences = filledTraces(service);
    traces.customTraces = {
      targetTemperature: customTrace([88, 93, 90], 'y11'),
    };
    traceReferences.customTraces = {
      targetTemperature: customTrace([96, 99, 97], 'y12'),
    };

    const layout = layoutFor(service, traces, true, traceReferences);
    const range = layout['yaxis11'].range;

    expect(range[0]).toBeLessThan(88);
    expect(range[1]).toBeGreaterThan(99);
  });

  it('normalizes a shared reference custom trace onto the active trace axis', () => {
    const traces = filledTraces(service);
    const traceReferences = filledTraces(service);
    traces.customTraces = {
      targetTemperature: customTrace([88, 93, 90], 'y11'),
    };
    traceReferences.customTraces = {
      targetTemperature: customTrace([96, 99, 97], 'y12'),
    };

    layoutFor(service, traces, true, traceReferences);

    expect(traceReferences.customTraces.targetTemperature.yaxis).toBe('y11');
  });

  it('keeps the fixed custom range exactly when the series fits inside it', () => {
    const traces = filledTraces(service);
    traces.customTraces = {
      targetTemperature: customTrace([5, 10]),
    };

    const layout = layoutFor(service, traces, true);

    expect(layout['yaxis11'].range).toEqual([0, 20]);
  });

  it('fits and pads a custom range when the series exceeds the fixed range', () => {
    const traces = filledTraces(service);
    traces.customTraces = {
      targetTemperature: customTrace([5, 21]),
    };

    const layout = layoutFor(service, traces, true);

    expect(layout['yaxis11'].range).toEqual([3.4, 22.6]);
  });

  it('keeps the fixed custom range when the series reaches its upper boundary', () => {
    const traces = filledTraces(service);
    traces.customTraces = {
      targetTemperature: customTrace([5, 20]),
    };

    const layout = layoutFor(service, traces, true);

    expect(layout['yaxis11'].range).toEqual([0, 20]);
  });

  it('keeps live custom axes pinned to zero when detail axes fit below zero', () => {
    const traces = filledTraces(service);
    traces.customTraces = {
      targetTemperature: customTrace([-5, 21]),
    };

    const liveLayout = layoutFor(service, traces, false);
    const detailLayout = layoutFor(service, traces, true);

    expect(liveLayout['yaxis11'].range).toEqual([0, 23.6]);
    expect(detailLayout['yaxis11'].range).toEqual([-7.6, 23.6]);
  });

  it('keeps an all-negative custom series fitted on the live chart', () => {
    const traces = filledTraces(service);
    traces.customTraces = {
      targetTemperature: customTrace([-8, -5, -6]),
    };

    const liveLayout = layoutFor(service, traces, false);

    expect(liveLayout['yaxis11'].range).toEqual([-8.3, -4.7]);
    expect(liveLayout['yaxis11'].range[0]).toBeLessThan(
      liveLayout['yaxis11'].range[1],
    );
  });

  it('keeps the latest all-negative live custom sample inside the expanded axis', () => {
    const range = expandLiveAxisRangeForSample([-8.3, -4.7], -5, 1.5, 1);

    expect(range[0]).toBeLessThanOrEqual(-5);
    expect(range[1]).toBeGreaterThanOrEqual(-5);
    expect(range).toEqual([-8.3, -2.5]);
  });

  it('widens the lower bound when an all-negative live custom sample moves lower', () => {
    const range = expandLiveAxisRangeForSample([-8.3, -4.7], -9, 1.5, 1);

    expect(range[0]).toBeLessThanOrEqual(-9);
    expect(range[1]).toBe(-4.7);
    expect(range).toEqual([-13.5, -4.7]);
  });

  it('lifts the upper bound above zero when a negative live series climbs back', () => {
    const range = expandLiveAxisRangeForSample([-8.3, -4.7], 1, 1.5, 1);

    expect(range[1]).toBeGreaterThanOrEqual(1);
    expect(range).toEqual([-8.3, 1.5]);
  });

  it('keeps a near-zero negative sample inside a range whose bound has crossed zero', () => {
    const range = expandLiveAxisRangeForSample([-1.099, 0.089], -0.01, 1.5, 1);

    expect(range[1]).toBeGreaterThanOrEqual(-0.01);
    expect(range).toEqual([-1.099, 0.089]);
  });

  it('keeps positive live custom expansion unchanged', () => {
    const range = expandLiveAxisRangeForSample([0, 20], 19.5, 1.5, 1);

    expect(range).toEqual([0, 29.25]);
  });

  it('keeps the detail chart fitted for an all-negative custom series', () => {
    const traces = filledTraces(service);
    traces.customTraces = {
      targetTemperature: customTrace([-8, -5, -6]),
    };

    const detailLayout = layoutFor(service, traces, true);

    expect(detailLayout['yaxis11'].range).toEqual([-8.3, -4.7]);
  });

  it('uses the fixed custom range for an exactly zero live series', () => {
    const traces = filledTraces(service);
    traces.customTraces = {
      targetTemperature: customTrace([0, 0, 0]),
    };

    const liveLayout = layoutFor(service, traces, false);
    const detailLayout = layoutFor(service, traces, true);

    expect(liveLayout['yaxis11'].range).toEqual([0, 20]);
    expect(detailLayout['yaxis11'].range).toEqual([0, 20]);
  });

  it('keeps an empty live custom series on the fixed range', () => {
    const traces = filledTraces(service);
    traces.customTraces = {
      targetTemperature: customTrace([]),
    };

    const liveLayout = layoutFor(service, traces, false);

    expect(liveLayout['yaxis11'].range).toEqual([0, 20]);
    expect(liveLayout['yaxis11'].range[0]).toBeLessThan(
      liveLayout['yaxis11'].range[1],
    );
  });

  it('keeps a flat negative live custom series visible', () => {
    const traces = filledTraces(service);
    traces.customTraces = {
      targetTemperature: customTrace([-5, -5, -5]),
    };

    const liveLayout = layoutFor(service, traces, false);

    expect(liveLayout['yaxis11'].range).toEqual([-6, -4]);
    expect(liveLayout['yaxis11'].range[0]).toBeLessThan(
      liveLayout['yaxis11'].range[1],
    );
  });

  it('leaves the active custom axis unchanged when the reference has no matching key', () => {
    const traces = filledTraces(service);
    const traceReferences = filledTraces(service);
    traces.customTraces = {
      targetTemperature: customTrace([88, 93, 90]),
    };
    traceReferences.customTraces = {
      pressureTarget: customTrace([120, 140, 130], 'y12'),
    };

    const layout = layoutFor(service, traces, true, traceReferences);
    const activeOnlyLayout = layoutFor(service, traces, true);

    expect(layout['yaxis11'].range).toEqual(activeOnlyLayout['yaxis11'].range);
    expect(traceReferences.customTraces.pressureTarget.yaxis).toBe('y12');
  });

  it('gives a flat custom series a visible band instead of a zero-height axis', () => {
    const traces = filledTraces(service);
    traces.customTraces = {
      targetTemperature: customTrace([93, 93, 93]),
    };

    const layout = layoutFor(service, traces, true);

    expect(layout['yaxis11'].range).toEqual([92, 94]);
  });

  it('falls back to the fixed custom range when the series is empty', () => {
    const traces = filledTraces(service);
    traces.customTraces = {
      targetTemperature: customTrace([]),
    };

    const layout = layoutFor(service, traces, true);

    expect(layout['yaxis11'].range).toEqual([0, 20]);
  });

  it('keeps the default water axis for a pour that just reaches it', () => {
    // The headroom must not apply below the default, or an ordinary brew
    // peaking at the boundary would silently redraw on [0, 105].
    const traces = filledTraces(service);
    traces.waterDispensedTrace.y = [0, 60, 100];

    const layout = layoutFor(service, traces, true);

    expect(layout['yaxis6'].range).toEqual([0, 100]);
  });

  it('keeps the water axis finite when a sample is not a number', () => {
    const traces = filledTraces(service);
    traces.waterDispensedTrace.y = [0, NaN, 260];

    const layout = layoutFor(service, traces, true);

    expect(Number.isFinite(layout['yaxis6'].range[1])).toBe(true);
    expect(layout['yaxis6'].range[1]).toBeGreaterThanOrEqual(260);
  });

  it('falls back to the fixed custom range when the series is missing', () => {
    const traces = filledTraces(service);
    const trace: any = customTrace([]);
    trace.y = undefined;
    traces.customTraces = { targetTemperature: trace };

    const layout = layoutFor(service, traces, true);

    expect(layout['yaxis11'].range).toEqual([0, 20]);
  });

  it('fits the water axis on the small card too', () => {
    const traces = filledTraces(service);
    traces.waterDispensedTrace.y = [0, 260];

    const layout = layoutFor(service, traces, false);

    expect(layout['yaxis6'].range[1]).toBeGreaterThanOrEqual(260);
  });
});
function filledTraces(service: GraphHelperService) {
  const traces = service.initializeTraces();
  return service.fillTraces(traces, graphSettings(), true);
}

function customTrace(values: number[], yaxis: string = 'y11') {
  return {
    x: values.map((_value, index) => index),
    y: values,
    yaxis,
    line: { color: '#000000' },
    visible: true,
  };
}

function layoutFor(
  service: GraphHelperService,
  traces: any,
  isDetail: boolean,
  traceReferences?: any,
) {
  return service.getChartLayout(
    traces,
    PREPARATION_STYLE_TYPE.FULL_IMMERSION,
    false,
    false,
    isDetail,
    300,
    150,
    true,
    traceReferences,
  );
}

function buildService(): GraphHelperService {
  const translate = jasmine.createSpyObj('TranslateService', ['instant']);
  translate.instant.and.callFake((key: string | undefined) => String(key));

  TestBed.configureTestingModule({
    providers: [
      GraphHelperService,
      {
        provide: TranslateService,
        useValue: translate,
      },
      {
        provide: UISettingsStorage,
        useValue: jasmine.createSpyObj('UISettingsStorage', {
          getSettings: new Settings(),
        }),
      },
      {
        provide: CoffeeBluetoothDevicesService,
        useValue: jasmine.createSpyObj('CoffeeBluetoothDevicesService', [
          'getScaleDelay',
          'getScale',
          'getPressureDevice',
          'getTemperatureDevice',
        ]),
      },
      {
        provide: Platform,
        useValue: jasmine.createSpyObj('Platform', ['is']),
      },
      {
        provide: ThemeService,
        useValue: jasmine.createSpyObj('ThemeService', {
          isDarkMode: false,
        }),
      },
    ],
  });

  return TestBed.inject(GraphHelperService);
}

function graphSettings() {
  return {
    weight: true,
    calc_flow: true,
    realtime_flow: true,
    pressure: true,
    temperature: true,
    weightSecond: true,
    realtime_flowSecond: true,
  };
}
