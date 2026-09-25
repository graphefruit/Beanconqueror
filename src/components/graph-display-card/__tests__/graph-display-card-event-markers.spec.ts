import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';

import { Platform } from '@ionic/angular/standalone';

import { Brew } from '../../../classes/brew/brew';
import { Settings } from '../../../classes/settings/settings';
import { GraphHelperService } from '../../../services/graphHelper/graph-helper.service';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { createMockUISettingsStorage } from '../../../test-utils';
import { GraphDisplayCardComponent } from '../graph-display-card.component';

const EMPTY_TRACES = {
  weightTrace: {},
  flowPerSecondTrace: {},
  realtimeFlowTrace: {},
  pressureTrace: {},
  temperatureTrace: {},
  waterDispensedTrace: {},
  waterDispensedFlowSecondTrace: {},
  weightTraceSecond: {},
  realtimeFlowTraceSecond: {},
};

describe('GraphDisplayCardComponent — initializeFlowChart() event markers', () => {
  let component: GraphDisplayCardComponent;
  let fixture: ComponentFixture<GraphDisplayCardComponent>;
  let graphHelperSpy: jasmine.SpyObj<GraphHelperService>;
  let mockUISettingsStorage: jasmine.SpyObj<any>;

  beforeEach(waitForAsync(() => {
    graphHelperSpy = jasmine.createSpyObj('GraphHelperService', [
      'initializeTraces',
      'fillTraces',
      'fillDataIntoTraces',
      'getChartLayout',
      'getEventMarkerShapes',
    ]);
    graphHelperSpy.initializeTraces.and.returnValue({ ...EMPTY_TRACES });
    graphHelperSpy.fillTraces.and.returnValue({ ...EMPTY_TRACES });
    graphHelperSpy.fillDataIntoTraces.and.returnValue(undefined);
    graphHelperSpy.getChartLayout.and.returnValue({});
    graphHelperSpy.getEventMarkerShapes.and.returnValue({ shapes: [], annotations: [] });

    mockUISettingsStorage = createMockUISettingsStorage();
    const settings = new Settings();
    settings.brew_event_markers_enabled = true;
    mockUISettingsStorage.getSettings.and.returnValue(settings);

    TestBed.overrideComponent(GraphDisplayCardComponent, {
      set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
    });

    TestBed.configureTestingModule({
      imports: [GraphDisplayCardComponent],
      providers: [
        { provide: Platform, useValue: jasmine.createSpyObj('Platform', ['is']) },
        { provide: UIHelper, useValue: jasmine.createSpyObj('UIHelper', ['cloneData', 'copyData']) },
        {
          provide: UIFileHelper,
          useValue: jasmine.createSpyObj('UIFileHelper', ['readInternalJSONFile']),
        },
        { provide: GraphHelperService, useValue: graphHelperSpy },
        { provide: UISettingsStorage, useValue: mockUISettingsStorage },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    spyOn(GraphDisplayCardComponent.prototype, 'ngOnInit').and.stub();

    fixture = TestBed.createComponent(GraphDisplayCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const profileNativeElement = Object.assign(document.createElement('div'), {
      removeAllListeners: jasmine.createSpy('removeAllListeners'),
    });
    component.profileDiv = { nativeElement: profileNativeElement } as any;
    component.canvaContainer = { nativeElement: { offsetWidth: 300 } } as any;

    (window as any).Plotly = {
      newPlot: jasmine.createSpy('newPlot'),
      purge: jasmine.createSpy('purge'),
    };
  });

  afterEach(() => {
    delete (window as any).Plotly;
  });

  it('should not call getEventMarkerShapes and should produce no marker shapes when brew is null', fakeAsync(() => {
    component.brew = null;

    component.initializeFlowChart();
    tick(100);

    expect(graphHelperSpy.getEventMarkerShapes).not.toHaveBeenCalled();

    const layout = (window as any).Plotly.newPlot.calls.mostRecent().args[2];
    const hasMarkerShape = (layout.shapes ?? []).some(
      (s: any) => s.customId === 'bloomShape' || s.customId === 'firstDripShape',
    );
    expect(hasMarkerShape).toBeFalse();
  }));

  it('should include marker shapes in layout when brew is set and markers are enabled', fakeAsync(() => {
    component.brew = new Brew();
    graphHelperSpy.getEventMarkerShapes.and.returnValue({
      shapes: [{ customId: 'bloomShape' }],
      annotations: [{ customId: 'bloomAnnotation' }],
    });

    component.initializeFlowChart();
    tick(100);

    expect(graphHelperSpy.getEventMarkerShapes).toHaveBeenCalledOnceWith(
      component.brew,
      jasmine.anything(),
    );

    const layout = (window as any).Plotly.newPlot.calls.mostRecent().args[2];
    expect(layout.shapes.some((s: any) => s.customId === 'bloomShape')).toBeTrue();
    expect(layout.annotations.some((a: any) => a.customId === 'bloomAnnotation')).toBeTrue();
  }));

  it('should produce no marker shapes in layout when brew is set but markers service returns empty', fakeAsync(() => {
    component.brew = new Brew();
    graphHelperSpy.getEventMarkerShapes.and.returnValue({ shapes: [], annotations: [] });

    component.initializeFlowChart();
    tick(100);

    const layout = (window as any).Plotly.newPlot.calls.mostRecent().args[2];
    const markerShapes = (layout.shapes ?? []).filter(
      (s: any) => s.customId === 'bloomShape' || s.customId === 'firstDripShape',
    );
    expect(markerShapes.length).toBe(0);
  }));

  it('should call Plotly.newPlot exactly once per initializeFlowChart() invocation', fakeAsync(() => {
    component.brew = null;

    component.initializeFlowChart();
    tick(100);

    expect((window as any).Plotly.newPlot.calls.count()).toBe(1);
  }));
});
