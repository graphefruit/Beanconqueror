import { ChangeDetectorRef, NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular';

import { TranslateService } from '@ngx-translate/core';

import { CoffeeBluetoothDevicesService } from '../../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { GraphHelperService } from '../../../../services/graphHelper/graph-helper.service';
import { TextToSpeechService } from '../../../../services/textToSpeech/text-to-speech.service';
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
import { BrewBrewingGraphComponent } from '../brew-brewing-graph.component';

/**
 * The maximized view, the barista page and the brew forms only talk to the
 * live graph through this interface, so the renderer behind it can change.
 */
describe('BrewBrewingGraphComponent interface for its hosts', () => {
  let component: BrewBrewingGraphComponent;
  let plotly: jasmine.SpyObj<{
    relayout: (div: HTMLElement, layout: object) => void;
    purge: (div: HTMLElement) => void;
  }>;
  let container: HTMLDivElement;
  let plot: HTMLDivElement;

  /** The drawing internals are private; the tests set them like Plotly would. */
  function internals(): Record<string, unknown> {
    return component as unknown as Record<string, unknown>;
  }

  beforeEach(() => {
    const stubs = [
      ChangeDetectorRef,
      ModalController,
      TranslateService,
      GraphHelperService,
      TextToSpeechService,
      UIAlert,
      UIBrewHelper,
      UIBrewStorage,
      UIFileHelper,
      UIGraphStorage,
      UIHelper,
      UILog,
      UIPreparationHelper,
      UIPreparationStorage,
      UISettingsStorage,
      UIToast,
    ].map((provide) => ({ provide, useValue: {} }));
    TestBed.configureTestingModule({
      providers: [
        ...stubs,
        {
          provide: NgZone,
          useValue: { runOutsideAngular: (fn: () => void) => fn() },
        },
        { provide: Platform, useValue: { is: () => true } },
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
    component = TestBed.runInInjectionContext(
      () => new BrewBrewingGraphComponent(),
    );

    container = document.createElement('div');
    plot = document.createElement('div');
    container.append(plot);
    Object.assign(internals(), {
      canvaContainer: { nativeElement: container },
      profileDiv: { nativeElement: plot },
    });
    plotly = jasmine.createSpyObj('Plotly', ['relayout', 'purge']);
    (window as unknown as { Plotly: unknown }).Plotly = plotly;
  });

  afterEach(() => {
    delete (window as unknown as { Plotly?: unknown }).Plotly;
  });

  describe('seriesState', () => {
    beforeEach(() => {
      Object.assign(internals(), {
        graphSettings: {},
        flow_profile_raw: {},
        brewComponent: undefined,
        graphHelper: {
          initializeTraces: () => ({ customTraces: {} }),
          fillTraces: (traces: Record<string, unknown>) => ({
            ...traces,
            weightTrace: { visible: true, line: { color: '#aa0000' } },
            pressureTrace: { visible: false, line: { color: '#00aa00' } },
            customTraces: {
              boiler: {
                visible: true,
                name: 'Boiler',
                line: { color: '#0a0' },
              },
            },
          }),
        },
        traceReferences: { weightTrace: { visible: true } },
        data: { brew_time: 0 },
        baristamode: true,
        showAdvancedBarista: false,
      });
      spyOn(component, 'checkChanges').and.stub();
    });

    it('is empty until the graph is set up', () => {
      expect(component.seriesState()).toEqual({ custom: {} });
    });

    it('shows the colour, name and visibility of each series once set up', () => {
      (internals()['__setupGraphs'] as () => void).call(component);

      expect(component.seriesState()).toEqual({
        weight: { visible: true, color: '#aa0000', name: undefined },
        pressure: { visible: false, color: '#00aa00', name: undefined },
        custom: { boiler: { visible: true, color: '#0a0', name: 'Boiler' } },
      });
    });

    it('follows a chip toggle, together with the reference line', () => {
      (internals()['__setupGraphs'] as () => void).call(component);

      component.toggleChartLines('weight');
      component.toggleChartLines('pressure');
      component.toggleChartLines('boiler');

      expect(component.seriesState().weight.visible).toBeFalse();
      expect(component.seriesState().pressure.visible).toBeTrue();
      expect(component.seriesState().custom['boiler'].visible).toBeFalse();
      expect(
        (
          internals()['traceReferences'] as {
            weightTrace: { visible: boolean };
          }
        ).weightTrace.visible,
      ).toBeFalse();
    });
  });

  describe('resize', () => {
    it('relayouts the graph at the given size', () => {
      internals()['lastChartLayout'] = { width: 1, height: 1 };

      component.resize(320, 180);

      expect(plotly.relayout).toHaveBeenCalledOnceWith(
        plot,
        jasmine.objectContaining({ width: 320, height: 180 }),
      );
    });

    it('waits for the graph to be drawn first', () => {
      component.resize(320, 180);

      expect(plotly.relayout).not.toHaveBeenCalled();
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

  it('frees the drawn graph when it is destroyed', () => {
    spyOn(component, 'destroy').and.stub();

    component.ngOnDestroy();

    expect(plotly.purge).toHaveBeenCalledOnceWith(plot);
  });
});
