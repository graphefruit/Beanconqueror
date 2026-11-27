import { TestBed } from '@angular/core/testing';

import { Platform } from '@ionic/angular';

import { TranslateService } from '@ngx-translate/core';

import { BrewFlow } from '../../../classes/brew/brewFlow';
import { Settings } from '../../../classes/settings/settings';
import type { SeriesDef } from '../../../components/brews/graph/series-def';
import { UplotRenderer } from '../../../components/brews/graph/uplot-renderer';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { CoffeeBluetoothDevicesService } from '../../coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { ThemeService } from '../../theme/theme.service';
import { UIFileHelper } from '../../uiFileHelper';
import { UISettingsStorage } from '../../uiSettingsStorage';
import { GraphHelperService } from '../graph-helper.service';
import { contrastRatio } from '../line-contrast';

describe('GraphHelperService custom axis names', () => {
  let service: GraphHelperService;

  beforeEach(() => {
    service = buildService();
  });

  it('renders a legacy custom axis without a prefix artifact', () => {
    const traces = service.initializeTraces();
    const brewFlow = new BrewFlow();
    addGraphSample(brewFlow);
    brewFlow.customMetrics.legacyPressure = [
      { value: 4, timestamp: '00:00:01.000', brew_time: '1.000' },
    ];
    brewFlow.customAxes = [
      {
        key: 'legacyPressure',
        name: 'Pressure',
        unit: 'bar',
        colorLight: '#000000',
        colorDark: '#ffffff',
      },
    ];

    service.fillTraces(traces, graphSettings(), true, false, brewFlow);
    service.fillDataIntoTraces(brewFlow, traces);

    expect(traces.customTraces.legacyPressure.name).toBe('Pressure');
  });

  it('renders an imported custom axis with its translated prefix', () => {
    const traces = service.initializeTraces();
    const brewFlow = new BrewFlow();
    addGraphSample(brewFlow);
    brewFlow.customMetrics.targetTemperature = [
      { value: 93, timestamp: '00:00:01.000', brew_time: '1.000' },
    ];
    brewFlow.customAxes = [
      {
        key: 'targetTemperature',
        namePrefix: 'BREW_IMPORT_METRIC_TARGET',
        name: 'Temperature',
        unit: '°C',
        colorLight: '#000000',
        colorDark: '#ffffff',
      },
    ];

    service.fillTraces(traces, graphSettings(), true, false, brewFlow);
    service.fillDataIntoTraces(brewFlow, traces);

    expect(traces.customTraces.targetTemperature.name).toBe(
      'Target: Temperature',
    );
  });

  it('fills custom metric traces when the brew flow contains only metrics', () => {
    const traces = service.initializeTraces();
    const brewFlow = new BrewFlow();
    brewFlow.customMetrics.targetTemperature = [
      { value: 93, timestamp: '00:00:00.000', brew_time: '0.000' },
      { value: 91, timestamp: '00:00:45.000', brew_time: '45.000' },
    ];
    brewFlow.customAxes = [
      {
        key: 'targetTemperature',
        namePrefix: 'BREW_IMPORT_METRIC_TARGET',
        name: 'Temperature',
        unit: '°C',
        colorLight: '#000000',
        colorDark: '#ffffff',
      },
    ];

    service.fillTraces(traces, graphSettings(), true, false, brewFlow);
    service.fillDataIntoTraces(brewFlow, traces);

    expect(traces.customTraces.targetTemperature.name).toBe(
      'Target: Temperature',
    );
    expect(traces.customTraces.targetTemperature.y).toEqual([93, 91]);
    expect(traces.customTraces.targetTemperature.x.length).toBe(2);
  });
});

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

const LIGHT = { dark: false, ink: '#4a382c', ground: '#fbfaf6' };
const DARK = { dark: true, ink: '#e1d1bf', ground: '#2a211a' };

/** Weight and realtime flow for two seconds, and an imported metric. */
function pictureFlow(): BrewFlow {
  const flow = new BrewFlow();
  flow.weight = [0, 1, 2].map((s) => ({
    actual_weight: s * 10,
    old_weight: 0,
    actual_smoothed_weight: 0,
    old_smoothed_weight: 0,
    calculated_real_flow: 0,
    not_mutated_weight: 0,
    timestamp: `00:00:0${s}.000`,
    brew_time: `${s}.000`,
  }));
  flow.realtimeFlow = [0, 1, 2].map((s) => ({
    flow_value: s,
    smoothed_weight: 0,
    timestampdelta: 0,
    timestamp: `00:00:0${s}.000`,
    brew_time: `${s}.000`,
  }));
  flow.customMetrics.extra = [
    { value: 4, timestamp: '00:00:01.000', brew_time: '1.000' },
  ];
  return flow;
}

describe('GraphHelperService graph picture', () => {
  let service: GraphHelperService;
  let platform: jasmine.SpyObj<Platform>;
  let files: Record<'readInternalJSONFile', jasmine.Spy>;

  beforeEach(() => {
    service = buildService();
    platform = TestBed.inject(Platform) as jasmine.SpyObj<Platform>;
    platform.is.and.returnValue(true);
    files = TestBed.inject(UIFileHelper) as unknown as typeof files;
  });

  describe('through the chart port', () => {
    let mount: jasmine.Spy;
    let setSeries: jasmine.Spy;
    let setVisible: jasmine.Spy;
    let exportImage: jasmine.Spy;
    let destroy: jasmine.Spy;

    beforeEach(() => {
      const port = UplotRenderer.prototype;
      mount = spyOn(port, 'mount').and.resolveTo();
      setSeries = spyOn(port, 'setSeries');
      spyOn(port, 'attach');
      setVisible = spyOn(port, 'setVisible');
      exportImage = spyOn(port, 'exportImage').and.resolveTo(
        'data:image/png;x',
      );
      destroy = spyOn(port, 'destroy');
    });

    function drawnDefs(): SeriesDef[] {
      return setSeries.calls.mostRecent().args[0] as SeriesDef[];
    }

    it('has no picture for a brew without graph and reads nothing', async () => {
      expect(
        await service.brewGraphImage({ flow_profile: '' }, 300, 150, LIGHT),
      ).toBe(undefined);
      expect(files.readInternalJSONFile).not.toHaveBeenCalled();
      expect(mount).not.toHaveBeenCalled();
    });

    it('has no picture for a graph file without samples', async () => {
      files.readInternalJSONFile.and.resolveTo(new BrewFlow());

      expect(
        await service.brewGraphImage(
          { flow_profile: 'b.json' },
          300,
          150,
          LIGHT,
        ),
      ).toBe(undefined);
      expect(exportImage).not.toHaveBeenCalled();
    });

    it('draws the graph file of a brew off screen at the size asked for, three times as sharp', async () => {
      files.readInternalJSONFile.and.resolveTo(pictureFlow());

      const image = await service.brewGraphImage(
        { flow_profile: 'brews/1_flow_profile.json' },
        300,
        150,
        LIGHT,
      );

      expect(image).toBe('data:image/png;x');
      expect(files.readInternalJSONFile).toHaveBeenCalledWith(
        'brews/1_flow_profile.json',
      );
      const [host, options] = mount.calls.mostRecent().args;
      expect((host as HTMLElement).isConnected).toBeFalse();
      expect(options).toEqual(
        jasmine.objectContaining({
          width: 300,
          height: 150,
          dark: false,
          mode: 'static',
        }),
      );
      expect(exportImage).toHaveBeenCalledOnceWith({
        width: 300,
        height: 150,
        theme: 'light',
        ink: '#4a382c',
        transparent: true,
        compact: true,
        scale: 3,
      });
      expect(drawnDefs().map((d) => d.id)).toEqual([
        'weight',
        'realtimeFlow',
        'custom:extra',
      ]);
      expect(destroy).toHaveBeenCalledTimes(1);
    });

    it('draws dark when asked, in a light app, with every line readable on the ground', async () => {
      files.readInternalJSONFile.and.resolveTo(pictureFlow());
      const colors = new Settings().graph_colors;

      await service.brewGraphImage({ flow_profile: 'b.json' }, 300, 150, DARK);

      expect(exportImage.calls.mostRecent().args[0]).toEqual(
        jasmine.objectContaining({ theme: 'dark', ink: '#e1d1bf' }),
      );
      const [weight, realtime] = drawnDefs();
      expect(weight.colour.dark).toBe(colors.weight.active.dark);
      // Too dark on the dark card, so lightened; the app's own colour stays.
      expect(colors.realtimeFlow.active.dark).toBe('#09485D');
      expect(realtime.colour.dark).not.toBe('#09485D');
      for (const def of drawnDefs()) {
        expect(contrastRatio(def.colour.dark, DARK.ground))
          .withContext(def.id)
          .toBeGreaterThanOrEqual(3);
      }

      await service.brewGraphImage({ flow_profile: 'b.json' }, 300, 150, LIGHT);
      expect(drawnDefs()[0].colour.light).not.toBe(colors.weight.active.light);
      for (const def of drawnDefs()) {
        expect(contrastRatio(def.colour.light, LIGHT.ground))
          .withContext(def.id)
          .toBeGreaterThanOrEqual(3);
      }
    });

    it('leaves an imported axis out that asks to start hidden', async () => {
      const flow = pictureFlow();
      flow.customAxes = [
        {
          key: 'extra',
          name: 'Extra',
          unit: 'x',
          colorLight: '#000000',
          colorDark: '#ffffff',
          hiddenDefault: true,
        },
      ];
      files.readInternalJSONFile.and.resolveTo(flow);

      await service.brewGraphImage({ flow_profile: 'b.json' }, 300, 150, LIGHT);

      expect(setVisible).toHaveBeenCalledWith('custom:extra', false);
      expect(setVisible).toHaveBeenCalledWith('weight', true);
    });

    it('passes on a graph file that cannot be read', async () => {
      files.readInternalJSONFile.and.rejectWith(new Error('gone'));

      await expectAsync(
        service.brewGraphImage(
          { flow_profile: 'brews/1.json' },
          300,
          150,
          LIGHT,
        ),
      ).toBeRejectedWithError('gone');
      expect(mount).not.toHaveBeenCalled();
    });

    it('passes on a failed drawing and lets go of the chart', async () => {
      files.readInternalJSONFile.and.resolveTo(pictureFlow());
      exportImage.and.rejectWith(new Error('no canvas'));

      await expectAsync(
        service.brewGraphImage({ flow_profile: 'b.json' }, 300, 150, LIGHT),
      ).toBeRejectedWithError('no canvas');
      expect(destroy).toHaveBeenCalledTimes(1);
    });
  });

  it('draws a clear PNG three times the size asked for', async () => {
    files.readInternalJSONFile.and.resolveTo(pictureFlow());

    const url = await service.brewGraphImage(
      { flow_profile: 'b.json' },
      300,
      150,
      LIGHT,
    );

    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    expect(image.width).toBe(900);
    expect(image.height).toBe(450);
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    expect(ctx.getImageData(1, 1, 1, 1).data[3]).toBe(0);
    const alpha = ctx
      .getImageData(0, 0, 900, 450)
      .data.filter((_v, i) => i % 4 === 3);
    expect(alpha.some((a) => a > 0)).toBeTrue();
    expect(document.querySelectorAll('.uplot').length).toBe(0);
  });

  it('draws a sample in the browser, which has no files', async () => {
    platform.is.and.returnValue(false);

    const flow = await service.readFlowProfile('brews/1.json');

    expect(flow.weight.length).toBeGreaterThan(0);
    expect(files.readInternalJSONFile).not.toHaveBeenCalled();
  });
});

function buildService(): GraphHelperService {
  const translate = jasmine.createSpyObj('TranslateService', ['instant']);
  translate.instant.and.callFake((key: string | undefined) => {
    if (key === 'BREW_IMPORT_METRIC_TARGET') {
      return 'Target';
    }
    return String(key);
  });

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
      {
        provide: UIFileHelper,
        useValue: jasmine.createSpyObj('UIFileHelper', [
          'readInternalJSONFile',
        ]),
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

function addGraphSample(brewFlow: BrewFlow): void {
  brewFlow.temperatureFlow = [
    {
      actual_temperature: 90,
      old_temperature: 0,
      timestamp: '00:00:00.000',
      brew_time: '0.000',
    },
  ];
}
