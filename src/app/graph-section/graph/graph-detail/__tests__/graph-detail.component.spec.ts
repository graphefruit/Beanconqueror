import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular';

import { provideTranslateService } from '@ngx-translate/core';

import { BrewFlow } from '../../../../../classes/brew/brewFlow';
import { Settings } from '../../../../../classes/settings/settings';
import { BrewGraphViewComponent } from '../../../../../components/brews/graph/brew-graph-view/brew-graph-view.component';
import { BREW_GRAPH_TYPE } from '../../../../../enums/brews/brewGraphType';
import { REFERENCE_GRAPH_TYPE } from '../../../../../enums/brews/referenceGraphType';
import type { IBrew } from '../../../../../interfaces/brew/iBrew';
import type { IGraph } from '../../../../../interfaces/graph/iGraph';
import { ThemeService } from '../../../../../services/theme/theme.service';
import { UIAnalytics } from '../../../../../services/uiAnalytics';
import { UIBrewStorage } from '../../../../../services/uiBrewStorage';
import { UIFileHelper } from '../../../../../services/uiFileHelper';
import { UIGraphStorage } from '../../../../../services/uiGraphStorage.service';
import { UILog } from '../../../../../services/uiLog';
import { UISettingsStorage } from '../../../../../services/uiSettingsStorage';
import { GraphDetailComponent } from '../graph-detail.component';

function flow(seconds = 5): BrewFlow {
  const brew = new BrewFlow();
  for (let s = 0; s < seconds; s++) {
    brew.pressureFlow.push({
      timestamp: `10:00:0${s}.000`,
      brew_time: String(s),
      actual_pressure: 9,
      old_pressure: 0,
    });
  }
  return brew;
}

function brew(reference: { type: REFERENCE_GRAPH_TYPE; uuid: string }): IBrew {
  return {
    flow_profile: 'brews/b1_flow_profile.json',
    config: { uuid: 'b1' },
    reference_flow_profile: reference,
  } as unknown as IBrew;
}

describe('GraphDetailComponent', () => {
  let fixture: ComponentFixture<GraphDetailComponent>;
  let capacitor: boolean;
  let files: Record<string, BrewFlow>;
  let brews: Map<string, unknown>;
  let graphs: Map<string, unknown>;
  let dismiss: jasmine.Spy;
  let trackEvent: jasmine.Spy;
  let logError: jasmine.Spy;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function graphView(): BrewGraphViewComponent | undefined {
    return fixture.debugElement.query(
      (each) => each.componentInstance instanceof BrewGraphViewComponent,
    )?.componentInstance as BrewGraphViewComponent | undefined;
  }

  async function open(
    props: Partial<{ graph: IGraph; brew: IBrew; flowProfileData: BrewFlow }>,
  ): Promise<void> {
    fixture = TestBed.createComponent(GraphDetailComponent);
    for (const [key, value] of Object.entries(props)) {
      fixture.componentRef.setInput(key, value);
    }
    // Reading files, and the bundled samples in the browser, takes a few tasks.
    for (let i = 0; i < 50 && !graphView(); i++) {
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve));
    }
    fixture.detectChanges();
  }

  beforeEach(() => {
    capacitor = true;
    files = {};
    brews = new Map();
    graphs = new Map();
    dismiss = jasmine.createSpy('dismiss').and.resolveTo(true);
    trackEvent = jasmine.createSpy('trackEvent');
    logError = jasmine.createSpy('error');
    const readInternalJSONFile = (path: string) =>
      path in files
        ? Promise.resolve(files[path])
        : Promise.reject(new Error(`missing ${path}`));
    TestBed.configureTestingModule({
      imports: [GraphDetailComponent],
      providers: [
        provideTranslateService(),
        { provide: Platform, useValue: { is: () => capacitor } },
        { provide: ModalController, useValue: { dismiss } },
        { provide: UIAnalytics, useValue: { trackEvent } },
        { provide: UILog, useValue: { error: logError } },
        { provide: UIFileHelper, useValue: { readInternalJSONFile } },
        {
          provide: UIBrewStorage,
          useValue: { getEntryByUUID: (uuid: string) => brews.get(uuid) },
        },
        {
          provide: UIGraphStorage,
          useValue: { getEntryByUUID: (uuid: string) => graphs.get(uuid) },
        },
        { provide: ThemeService, useValue: { dark: () => false } },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => new Settings() },
        },
      ],
    });
  });

  afterEach(() => fixture?.destroy());

  it('shows a stored graph and tracks the view', async () => {
    files['graphs/g1.json'] = flow();
    await open({
      graph: { flow_profile: 'graphs/g1.json' } as unknown as IGraph,
    });

    expect(trackEvent).toHaveBeenCalled();
    expect(graphView().flow()).toBe(files['graphs/g1.json']);
    expect(graphView().reference()).toBeNull();
    expect(graphView().timeSlider()).toBeTrue();
    expect(element().querySelector('ion-spinner')).toBeNull();
  });

  it('shows flow data that is not stored yet', async () => {
    const data = flow();
    await open({ flowProfileData: data });

    expect(graphView().flow()).toBe(data);
  });

  it('shows a brew with the reference brew it was made against', async () => {
    files['brews/b1_flow_profile.json'] = flow();
    files['brews/ref.json'] = flow(3);
    brews.set('b1', brew({ type: REFERENCE_GRAPH_TYPE.BREW, uuid: 'r1' }));
    const getGraphPath = jasmine
      .createSpy('getGraphPath')
      .and.returnValue('brews/ref.json');
    brews.set('r1', { getGraphPath });
    await open({ brew: brews.get('b1') as IBrew });

    expect(getGraphPath).toHaveBeenCalledWith(BREW_GRAPH_TYPE.BREW);
    expect(graphView().reference()).toBe(files['brews/ref.json']);
    expect(element().querySelector('.hint')).toBeNull();
  });

  it('takes the graph file of an imported or stored reference graph', async () => {
    files['brews/b1_flow_profile.json'] = flow();
    files['brews/imported.json'] = flow(2);
    const getGraphPath = jasmine
      .createSpy('getGraphPath')
      .and.returnValue('brews/imported.json');
    brews.set(
      'b1',
      brew({
        type: REFERENCE_GRAPH_TYPE.IMPORTED_GRAPH,
        uuid: 'r1',
      }),
    );
    brews.set('r1', { getGraphPath });
    await open({ brew: brews.get('b1') as IBrew });
    expect(getGraphPath).toHaveBeenCalledWith(BREW_GRAPH_TYPE.IMPORTED_GRAPH);
    expect(graphView().reference()).toBe(files['brews/imported.json']);
    fixture.destroy();

    files['graphs/g1.json'] = flow(4);
    graphs.set('g1', { getGraphPath: () => 'graphs/g1.json' });
    brews.set('b1', brew({ type: REFERENCE_GRAPH_TYPE.GRAPH, uuid: 'g1' }));
    await open({ brew: brews.get('b1') as IBrew });
    expect(graphView().reference()).toBe(files['graphs/g1.json']);
  });

  it('says so when the reference has been deleted or cannot be read', async () => {
    files['brews/b1_flow_profile.json'] = flow();
    brews.set('b1', brew({ type: REFERENCE_GRAPH_TYPE.BREW, uuid: 'gone' }));
    await open({ brew: brews.get('b1') as IBrew });

    expect(graphView().flow()).toBe(files['brews/b1_flow_profile.json']);
    expect(element().querySelector('.hint').textContent.trim()).toBe(
      'GRAPH_REFERENCE_CANNOT_BE_SHOWN',
    );
    fixture.destroy();

    brews.set('r1', { getGraphPath: () => 'brews/broken.json' });
    brews.set('b1', brew({ type: REFERENCE_GRAPH_TYPE.BREW, uuid: 'r1' }));
    await open({ brew: brews.get('b1') as IBrew });
    expect(logError).toHaveBeenCalled();
    expect(element().querySelector('.hint')).not.toBeNull();
  });

  it('shows a brew without reference, also when the brew itself is gone', async () => {
    files['brews/b1_flow_profile.json'] = flow();
    brews.set('b1', brew({ type: REFERENCE_GRAPH_TYPE.NONE, uuid: '' }));
    await open({ brew: brews.get('b1') as IBrew });
    expect(graphView().reference()).toBeNull();
    expect(element().querySelector('.hint')).toBeNull();
    fixture.destroy();

    brews.delete('b1');
    await open({ brew: brew(undefined) });
    expect(graphView().flow()).toBe(files['brews/b1_flow_profile.json']);
    expect(element().querySelector('.hint')).toBeNull();
  });

  it('shows a hint for a missing or damaged flow file', async () => {
    await open({
      graph: { flow_profile: 'graphs/missing.json' } as unknown as IGraph,
    });
    expect(logError).toHaveBeenCalled();
    expect(graphView().flow()).toBeNull();
    expect(element().textContent).toContain('GRAPH_CANNOT_BE_SHOWN');
    fixture.destroy();

    await open({ graph: { flow_profile: '' } as unknown as IGraph });
    expect(graphView().flow()).toBeNull();
  });

  it('reads the bundled sample profiles in the browser', async () => {
    capacitor = false;
    await open({ brew: brew(undefined) });

    expect(graphView().flow()?.weight.length).toBeGreaterThan(0);
    expect(graphView().reference()?.weight.length).toBeGreaterThan(0);
    fixture.destroy();

    await open({ graph: { flow_profile: 'x' } as unknown as IGraph });
    expect(graphView().flow()?.weight.length).toBeGreaterThan(0);
  });

  it('closes with its button', async () => {
    await open({ flowProfileData: flow() });

    element().querySelector<HTMLElement>('app-brew-graph-view .close').click();

    expect(dismiss).toHaveBeenCalledWith(
      { dismissed: true },
      undefined,
      GraphDetailComponent.COMPONENT_ID,
    );
  });

  it('offers the close button while it loads', () => {
    fixture = TestBed.createComponent(GraphDetailComponent);
    fixture.componentRef.setInput('graph', {
      flow_profile: 'graphs/slow.json',
    });
    files['graphs/slow.json'] = flow();
    fixture.detectChanges();

    expect(element().querySelector('.loading ion-spinner')).not.toBeNull();
    expect(element().querySelector('.loading .close')).not.toBeNull();
  });
});
