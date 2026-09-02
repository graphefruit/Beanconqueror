import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular/standalone';

import { TranslateService } from '@ngx-translate/core';

import { Brew } from '../../../../classes/brew/brew';
import { Settings } from '../../../../classes/settings/settings';
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
import { createMockUISettingsStorage } from '../../../../test-utils';
import { BrewBrewingGraphComponent } from '../brew-brewing-graph.component';

describe('BrewBrewingGraphComponent — updateEventMarkers()', () => {
  let component: BrewBrewingGraphComponent;
  let fixture: ComponentFixture<BrewBrewingGraphComponent>;
  let graphHelperSpy: jasmine.SpyObj<GraphHelperService>;

  beforeEach(waitForAsync(() => {
    graphHelperSpy = jasmine.createSpyObj('GraphHelperService', [
      'getEventMarkerShapes',
    ]);

    const mockUISettingsStorage = createMockUISettingsStorage();
    mockUISettingsStorage.getSettings.and.returnValue(new Settings());

    TestBed.overrideComponent(BrewBrewingGraphComponent, {
      set: { template: '', imports: [], schemas: [NO_ERRORS_SCHEMA] },
    });

    TestBed.configureTestingModule({
      imports: [BrewBrewingGraphComponent],
      providers: [
        { provide: Platform, useValue: jasmine.createSpyObj('Platform', ['is']) },
        {
          provide: CoffeeBluetoothDevicesService,
          useValue: jasmine.createSpyObj('CoffeeBluetoothDevicesService', [
            'attachOnEvent',
            'getScale',
            'getPressureDevice',
            'getTemperatureDevice',
          ]),
        },
        {
          provide: UIPreparationStorage,
          useValue: jasmine.createSpyObj('UIPreparationStorage', [
            'getAllEntries',
          ]),
        },
        {
          provide: TranslateService,
          useValue: jasmine.createSpyObj('TranslateService', ['instant', 'get']),
        },
        {
          provide: UIAlert,
          useValue: jasmine.createSpyObj('UIAlert', ['showMessage']),
        },
        {
          provide: UIToast,
          useValue: jasmine.createSpyObj('UIToast', ['showInfoToast']),
        },
        {
          provide: UIHelper,
          useValue: jasmine.createSpyObj('UIHelper', ['cloneData', 'copyData']),
        },
        {
          provide: UIBrewStorage,
          useValue: jasmine.createSpyObj('UIBrewStorage', ['getAllEntries']),
        },
        {
          provide: UIPreparationHelper,
          useValue: jasmine.createSpyObj('UIPreparationHelper', [
            'detailPreparation',
          ]),
        },
        { provide: UISettingsStorage, useValue: mockUISettingsStorage },
        {
          provide: UIFileHelper,
          useValue: jasmine.createSpyObj('UIFileHelper', [
            'readInternalJSONFile',
          ]),
        },
        {
          provide: ModalController,
          useValue: jasmine.createSpyObj('ModalController', [
            'create',
            'dismiss',
          ]),
        },
        {
          provide: UILog,
          useValue: jasmine.createSpyObj('UILog', ['log', 'error']),
        },
        {
          provide: UIBrewHelper,
          useValue: jasmine.createSpyObj('UIBrewHelper', ['fieldVisible']),
        },
        {
          provide: UIGraphStorage,
          useValue: jasmine.createSpyObj('UIGraphStorage', ['getAllEntries']),
        },
        {
          provide: TextToSpeechService,
          useValue: jasmine.createSpyObj('TextToSpeechService', ['speak']),
        },
        { provide: GraphHelperService, useValue: graphHelperSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    spyOn(BrewBrewingGraphComponent.prototype, 'ngOnInit').and.stub();

    fixture = TestBed.createComponent(BrewBrewingGraphComponent);
    component = fixture.componentInstance;

    const settings = new Settings();
    settings.brew_event_markers_enabled = true;
    component.data = new Brew();
    component.settings = settings;

    fixture.detectChanges();

    (window as any).Plotly = {
      relayout: jasmine.createSpy('relayout'),
      purge: jasmine.createSpy('purge'),
    };

    component.lastChartLayout = { shapes: [], annotations: [] };
    component.profileDiv = { nativeElement: document.createElement('div') } as any;
  });

  afterEach(() => {
    delete (window as any).Plotly;
  });

  it('should not call Plotly.relayout when lastChartLayout is undefined', fakeAsync(() => {
    component.lastChartLayout = undefined as any;

    component.updateEventMarkers();
    tick(0);

    expect((window as any).Plotly.relayout).not.toHaveBeenCalled();
  }));

  it('should not call Plotly.relayout when profileDiv is undefined', fakeAsync(() => {
    component.profileDiv = undefined as any;

    component.updateEventMarkers();
    tick(0);

    expect((window as any).Plotly.relayout).not.toHaveBeenCalled();
  }));

  it('should remove stale marker shapes from lastChartLayout', fakeAsync(() => {
    component.lastChartLayout.shapes = [
      { customId: 'bloomShape' },
      { customId: 'firstDripShape' },
    ];
    graphHelperSpy.getEventMarkerShapes.and.returnValue({ shapes: [], annotations: [] });

    component.updateEventMarkers();
    tick(0);

    expect(component.lastChartLayout.shapes.length).toBe(0);
  }));

  it('should preserve non-marker shapes while removing marker shapes', fakeAsync(() => {
    component.lastChartLayout.shapes = [
      { customId: 'targetWeightLine' },
      { customId: 'bloomShape' },
    ];
    graphHelperSpy.getEventMarkerShapes.and.returnValue({ shapes: [], annotations: [] });

    component.updateEventMarkers();
    tick(0);

    expect(component.lastChartLayout.shapes.length).toBe(1);
    expect(component.lastChartLayout.shapes[0].customId).toBe('targetWeightLine');
  }));

  it('should append new marker shapes returned by the service', fakeAsync(() => {
    component.lastChartLayout.shapes = [];
    component.lastChartLayout.annotations = [];
    graphHelperSpy.getEventMarkerShapes.and.returnValue({
      shapes: [{ customId: 'bloomShape' }],
      annotations: [{ customId: 'bloomAnnotation' }],
    });

    component.updateEventMarkers();
    tick(0);

    expect(component.lastChartLayout.shapes.some((s: any) => s.customId === 'bloomShape')).toBeTrue();
    expect(component.lastChartLayout.annotations.some((a: any) => a.customId === 'bloomAnnotation')).toBeTrue();
  }));

  it('should be idempotent — calling twice produces no duplicate shapes', fakeAsync(() => {
    component.lastChartLayout.shapes = [{ customId: 'bloomShape' }];
    component.lastChartLayout.annotations = [];
    graphHelperSpy.getEventMarkerShapes.and.returnValue({
      shapes: [{ customId: 'bloomShape' }],
      annotations: [],
    });

    component.updateEventMarkers();
    tick(0);
    component.updateEventMarkers();
    tick(0);

    const bloomShapes = component.lastChartLayout.shapes.filter(
      (s: any) => s.customId === 'bloomShape',
    );
    expect(bloomShapes.length).toBe(1);
  }));

  it('should call Plotly.relayout with profileDiv.nativeElement after update', fakeAsync(() => {
    graphHelperSpy.getEventMarkerShapes.and.returnValue({ shapes: [], annotations: [] });

    component.updateEventMarkers();
    tick(0);

    expect((window as any).Plotly.relayout).toHaveBeenCalledOnceWith(
      component.profileDiv.nativeElement,
      component.lastChartLayout,
    );
  }));

  it('should not crash when lastChartLayout has no shapes key', fakeAsync(() => {
    component.lastChartLayout = {} as any;
    graphHelperSpy.getEventMarkerShapes.and.returnValue({
      shapes: [{ customId: 'bloomShape' }],
      annotations: [],
    });

    expect(() => {
      component.updateEventMarkers();
      tick(0);
    }).not.toThrow();

    expect(component.lastChartLayout.shapes.length).toBe(1);
  }));
});
