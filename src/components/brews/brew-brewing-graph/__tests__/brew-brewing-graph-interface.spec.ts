import { ChangeDetectorRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular';

import { TranslateService } from '@ngx-translate/core';

import { Brew } from '../../../../classes/brew/brew';
import { BrewFlow } from '../../../../classes/brew/brewFlow';
import { Preparation } from '../../../../classes/preparation/preparation';
import { MeticulousDevice } from '../../../../classes/preparationDevice/meticulous/meticulousDevice';
import { Settings } from '../../../../classes/settings/settings';
import { PREPARATION_STYLE_TYPE } from '../../../../enums/preparations/preparationStyleTypes';
import { CoffeeBluetoothDevicesService } from '../../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { TextToSpeechService } from '../../../../services/textToSpeech/text-to-speech.service';
import { ThemeService } from '../../../../services/theme/theme.service';
import { UIAlert } from '../../../../services/uiAlert';
import { UIBrewHelper } from '../../../../services/uiBrewHelper';
import { UIBrewStorage } from '../../../../services/uiBrewStorage';
import { UIFileHelper } from '../../../../services/uiFileHelper';
import { UIGraphStorage } from '../../../../services/uiGraphStorage.service';
import { UIHelper } from '../../../../services/uiHelper';
import { UILog } from '../../../../services/uiLog';
import { UIPreparationHelper } from '../../../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { UIToast } from '../../../../services/uiToast';
import type { Viewport } from '../../graph/brew-chart-port';
import type { FlowSeriesBuffer } from '../../graph/flow-series-buffer';
import type { SeriesDef } from '../../graph/series-def';
import { UplotRenderer } from '../../graph/uplot-renderer';
import { BrewBrewingGraphComponent } from '../brew-brewing-graph.component';

/** A brew file with a custom metric whose axis hides it at first. */
function flowWithMetric(): BrewFlow {
  const flow = new BrewFlow();
  flow.weight = [
    {
      timestamp: '08:00:00.000',
      brew_time: '0.0',
      actual_weight: 0,
      old_weight: 0,
      actual_smoothed_weight: 0,
      old_smoothed_weight: 0,
      calculated_real_flow: 0,
      not_mutated_weight: 0,
    },
    {
      timestamp: '08:00:01.000',
      brew_time: '1.0',
      actual_weight: 2.5,
      old_weight: 0,
      actual_smoothed_weight: 2.4,
      old_smoothed_weight: 0,
      calculated_real_flow: 0,
      not_mutated_weight: 2.6,
    },
  ];
  flow.customMetrics = {
    boiler: [{ timestamp: '08:00:00.500', brew_time: '0.5', value: 92 }],
  };
  flow.customAxes = [
    {
      key: 'boiler',
      name: 'Boiler',
      unit: '°C',
      colorLight: '#00aa00',
      colorDark: '#00ff00',
      hiddenDefault: true,
    },
  ];
  return flow;
}

/** A Meticulous shot stored before its samples had brew times. */
function legacyMeticulousFlow(): BrewFlow {
  const flow = MeticulousDevice.returnBrewFlowForShotData(
    [100, 1350, 30125].map((time, index) => ({
      time,
      shot: { weight: index * 12, pressure: 9, gravimetric_flow: 2 },
    })),
  );
  for (const samples of [flow.weight, flow.pressureFlow, flow.realtimeFlow]) {
    samples.forEach((sample) => (sample.brew_time = ''));
  }
  return flow;
}

/**
 * The maximized view, the barista page and the brew forms only talk to the
 * live graph through this interface; the chart behind it is the uPlot port.
 */
describe('BrewBrewingGraphComponent interface for its hosts', () => {
  let component: BrewBrewingGraphComponent;
  let settings: Settings;
  let dark: ReturnType<typeof signal<boolean>>;
  let container: HTMLDivElement;
  let plot: HTMLDivElement;
  let port: {
    mount: jasmine.Spy;
    setSeries: jasmine.Spy;
    attach: jasmine.Spy;
    setReferences: jasmine.Spy;
    setVisible: jasmine.Spy;
    setViewport: jasmine.Spy;
    setDark: jasmine.Spy;
    resize: jasmine.Spy;
    destroy: jasmine.Spy;
  };
  let timerRunning: boolean;
  let maximized: boolean;
  let readInternalJSONFile: jasmine.Spy;

  function internals(): Record<string, unknown> {
    return component as unknown as Record<string, unknown>;
  }

  const lastDefs = (): SeriesDef[] =>
    port.setSeries.calls.mostRecent().args[0] as SeriesDef[];
  const attached = (): FlowSeriesBuffer =>
    port.attach.calls.mostRecent().args[0] as FlowSeriesBuffer;
  const lastViewport = (): Viewport =>
    port.setViewport.calls.mostRecent().args[0] as Viewport;

  /** Lets the chart library load and the renderer take the series. */
  async function draw(): Promise<void> {
    component.initializeFlowChart();
    await new Promise((resolve) => setTimeout(resolve));
  }

  beforeEach(() => {
    settings = new Settings();
    dark = signal(false);
    timerRunning = false;
    maximized = false;
    readInternalJSONFile = jasmine.createSpy('readInternalJSONFile');
    const preparation = new Preparation();
    preparation.style_type = PREPARATION_STYLE_TYPE.ESPRESSO;

    const stubs = [
      ChangeDetectorRef,
      ModalController,
      TextToSpeechService,
      UIAlert,
      UIBrewHelper,
      UIBrewStorage,
      UIGraphStorage,
      UIPreparationHelper,
      UIPreparationStorage,
      UIToast,
    ].map((provide) => ({ provide, useValue: {} }));
    TestBed.configureTestingModule({
      providers: [
        ...stubs,
        { provide: Platform, useValue: { is: () => true } },
        { provide: ThemeService, useValue: { dark } },
        {
          provide: TranslateService,
          useValue: { instant: (key: string) => key },
        },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => settings },
        },
        { provide: UIFileHelper, useValue: { readInternalJSONFile } },
        {
          provide: UIHelper,
          useValue: { getActualTimeWithMilliseconds: () => '08:00:00.000' },
        },
        { provide: UILog, useValue: jasmine.createSpyObj('UILog', ['error']) },
        {
          provide: CoffeeBluetoothDevicesService,
          useValue: {
            getScale: () => undefined,
            getPressureDevice: () => undefined,
            getTemperatureDevice: () => undefined,
          },
        },
      ],
    });

    port = {
      mount: spyOn(UplotRenderer.prototype, 'mount').and.resolveTo(),
      setSeries: spyOn(UplotRenderer.prototype, 'setSeries'),
      attach: spyOn(UplotRenderer.prototype, 'attach'),
      setReferences: spyOn(UplotRenderer.prototype, 'setReferences'),
      setVisible: spyOn(UplotRenderer.prototype, 'setVisible'),
      setViewport: spyOn(UplotRenderer.prototype, 'setViewport'),
      setDark: spyOn(UplotRenderer.prototype, 'setDark'),
      resize: spyOn(UplotRenderer.prototype, 'resize'),
      destroy: spyOn(UplotRenderer.prototype, 'destroy'),
    };

    component = TestBed.runInInjectionContext(
      () => new BrewBrewingGraphComponent(),
    );
    container = document.createElement('div');
    plot = document.createElement('div');
    container.append(plot);
    document.body.append(container);
    const data = new Brew();
    data.config.uuid = 'brew-1';
    spyOn(data, 'getPreparation').and.returnValue(preparation);
    Object.assign(internals(), {
      canvaContainer: { nativeElement: container },
      profileDiv: { nativeElement: plot },
      data,
      brewComponent: {
        get maximizeFlowGraphIsShown() {
          return maximized;
        },
        timer: { isTimerRunning: () => timerRunning },
        choosenPreparation: preparation,
      },
    });
    component.ngOnInit();
    spyOn(component, 'checkChanges').and.stub();
  });

  afterEach(() => {
    component.ngOnDestroy();
    container.remove();
  });

  describe('seriesState', () => {
    it('is empty until the graph is set up', () => {
      expect(component.seriesState()).toEqual({ custom: {} });
    });

    it('names and colours every series from the settings, hiding what they hide', async () => {
      settings.graph.ESPRESSO.calc_flow = false;
      component.flow_profile_raw = flowWithMetric();

      await draw();
      const state = component.seriesState();

      expect(state.weight).toEqual({
        visible: true,
        color: settings.graph_colors.weight.active.light,
        name: 'BREW_FLOW_WEIGHT',
      });
      expect(state.calc_flow.visible).toBeFalse();
      expect(state.custom['boiler']).toEqual({
        visible: false,
        color: '#00aa00',
        name: 'Boiler',
      });
      expect(component.uiCustomMetricsKeys).toEqual(['boiler']);
      expect(port.setVisible).toHaveBeenCalledWith('flowPerSecond', false);
      expect(port.setVisible).toHaveBeenCalledWith('custom:boiler', false);
    });

    it('follows a chip toggle and hides the line with its reference', async () => {
      await draw();

      component.toggleChartLines('weight');
      component.toggleChartLines('boiler');

      expect(component.seriesState().weight.visible).toBeFalse();
      expect(port.setVisible).toHaveBeenCalledWith('weight', false);
      expect(port.setVisible.calls.mostRecent().args).toEqual([
        'custom:boiler',
        false,
      ]);

      component.toggleChartLines('weight');
      expect(component.seriesState().weight.visible).toBeTrue();
      expect(port.setVisible.calls.mostRecent().args).toEqual(['weight', true]);
    });

    it('takes the colours of the theme when the theme changes', async () => {
      await draw();

      dark.set(true);
      TestBed.tick();

      expect(component.seriesState().weight.color).toBe(
        settings.graph_colors.weight.active.dark,
      );
      expect(port.setDark).toHaveBeenCalledWith(true);
    });
  });

  describe('readings', () => {
    it('keeps a reading that came before the graph was set up', async () => {
      (
        component as unknown as {
          pushPressureProfile: (t: string, p: number, o: number) => void;
        }
      ).pushPressureProfile('0.0', 9, 0);

      await draw();

      expect(component.flow_profile_raw.pressureFlow.length).toBe(1);
      expect(Array.from(attached().view('pressure').y)).toEqual([9]);
    });

    it('draws an imported shot in place of what was drawn', async () => {
      await draw();

      component.flow_profile_raw = flowWithMetric();
      component.initializeFlowChart();

      expect(Array.from(attached().view('weight').y)).toEqual([0, 2.5]);
      expect(attached().has('custom:boiler')).toBeTrue();
      expect(lastDefs().map((d) => d.id)).toContain('custom:boiler');
    });

    it('draws the chosen reference under the live lines, without the second scale', async () => {
      const reference = flowWithMetric();
      reference.weightSecond = reference.weight;
      component.reference_profile_raw = reference;

      await draw();

      const references = lastDefs().filter((d) => d.kind === 'reference');
      expect(references.map((d) => d.id)).toEqual(['weight']);
      expect(port.setReferences.calls.mostRecent().args[0]).not.toBeNull();
    });

    it('draws no reference when none is chosen', async () => {
      await draw();

      expect(port.setReferences.calls.mostRecent().args[0]).toBeNull();
    });
  });

  describe('time range', () => {
    it('jumps by the time of the brew form until something was recorded', async () => {
      await draw();

      expect(lastViewport()).toEqual({
        mode: 'stepped',
        windowSec: settings.graph_time.ESPRESSO.NORMAL_SCREEN,
        backSec: settings.graph_time.ESPRESSO.NORMAL_SCREEN - 10,
      });
    });

    it('jumps by the maximized time while the timer runs maximized', async () => {
      component.flow_profile_raw = flowWithMetric();
      await draw();
      timerRunning = true;
      maximized = true;

      component.updateChart();

      expect(lastViewport()).toEqual({
        mode: 'stepped',
        windowSec: settings.graph_time.ESPRESSO.FULL_SCREEN,
        backSec: settings.graph_time.ESPRESSO.FULL_SCREEN - 20,
      });
    });

    it('shows the whole brew once the timer is paused, without any device', async () => {
      component.flow_profile_raw = flowWithMetric();
      await draw();
      await component.timerResumed(undefined);
      expect(lastViewport().mode).toBe('stepped');

      await component.timerPaused(undefined);

      expect(lastViewport()).toEqual({ mode: 'fitAll' });
    });

    it('shows a stored brew whole while the timer stands', async () => {
      component.flow_profile_raw = flowWithMetric();

      await draw();

      expect(lastViewport()).toEqual({ mode: 'fitAll' });
    });
  });

  describe('editing', () => {
    for (const [name, stored] of [
      ['a brew with custom metrics', flowWithMetric()],
      ['a legacy Meticulous shot', legacyMeticulousFlow()],
    ] as const) {
      it(`saves ${name} unchanged after showing it`, async () => {
        const file = JSON.stringify(stored);
        readInternalJSONFile.and.callFake(() =>
          Promise.resolve(JSON.parse(file) as BrewFlow),
        );
        component.isEdit = true;

        await component.readFlowProfile();
        await draw();
        component.toggleChartLines('weight');
        component.updateChart();

        expect(readInternalJSONFile).toHaveBeenCalledWith(
          'brews/brew-1_flow_profile.json',
        );
        expect(attached().length('weight')).toBe(stored.weight.length);
        expect(JSON.stringify(component.flow_profile_raw)).toBe(file);
      });
    }
  });

  describe('size', () => {
    it('resizes the drawn graph and keeps the height in its own container', async () => {
      await draw();

      component.resize(320, 180);
      expect(port.resize).toHaveBeenCalledWith(320, 180);

      spyOnProperty(container, 'offsetWidth').and.returnValue(300);
      component.onOrientationChange();
      expect(port.resize).toHaveBeenCalledWith(300, 150);
    });

    it('does nothing before the graph is drawn', () => {
      component.resize(320, 180);

      expect(port.resize).not.toHaveBeenCalled();
    });

    it('leaves the size to the host it was moved to', async () => {
      await draw();
      component.moveGraphTo(document.createElement('div'));
      port.resize.calls.reset();

      component.onOrientationChange();
      expect(port.resize).not.toHaveBeenCalled();

      component.resize(800, 400);
      expect(port.resize).toHaveBeenCalledWith(800, 400);
    });
  });

  it('reports the box of its container', () => {
    spyOnProperty(container, 'offsetTop').and.returnValue(42);
    spyOnProperty(container, 'offsetWidth').and.returnValue(300);

    expect(component.graphBox()).toEqual({ top: 42, width: 300 });
  });

  it('moves the graph into another host and back', () => {
    const host = document.createElement('div');

    component.moveGraphTo(host);
    expect(plot.parentElement).toBe(host);

    component.restoreGraph();
    expect(plot.parentElement).toBe(container);
  });

  it('mounts the chart once and lets go of it when destroyed', async () => {
    spyOn(component, 'destroy').and.stub();
    await draw();
    await draw();

    component.ngOnDestroy();

    expect(port.mount).toHaveBeenCalledOnceWith(
      plot,
      jasmine.objectContaining({ mode: 'live', height: 150 }),
    );
    expect(port.destroy).toHaveBeenCalledTimes(1);
  });

  it('works on without a graph when the chart library cannot load', async () => {
    port.mount.and.rejectWith(new Error('offline'));

    await draw();
    component.resize(320, 180);

    expect(port.resize).not.toHaveBeenCalled();
    expect(component.seriesState().weight.visible).toBeTrue();
  });
});
