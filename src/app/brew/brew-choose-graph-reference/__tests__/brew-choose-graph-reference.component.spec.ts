import { TestBed } from '@angular/core/testing';

import { IonContent, ModalController, Platform } from '@ionic/angular';

import { Brew } from '../../../../classes/brew/brew';
import { Graph } from '../../../../classes/graph/graph';
import { Settings } from '../../../../classes/settings/settings';
import { UIAlert } from '../../../../services/uiAlert';
import { UIBrewStorage } from '../../../../services/uiBrewStorage';
import { UIGraphHelper } from '../../../../services/uiGraphHelper';
import { UIGraphStorage } from '../../../../services/uiGraphStorage.service';
import { UIHelper } from '../../../../services/uiHelper';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { BrewChooseGraphReferenceComponent } from '../brew-choose-graph-reference.component';

const PREPARATION = 'v60';

function brew(note: string, archived = false, timestamp = 0): Brew {
  const part = { finished: archived, name: note, roaster: '' };
  return {
    note,
    method_of_preparation: PREPARATION,
    method_of_preparation_tools: [],
    rating: 0,
    config: { uuid: `brew-${note}`, unix_timestamp: timestamp },
    getBean: () => part,
    getMill: () => ({ finished: false }),
    getPreparation: () => ({ finished: false, name: PREPARATION }),
  } as unknown as Brew;
}

function graph(name: string, finished = false): Graph {
  return { name, finished, config: { uuid: `graph-${name}` } } as Graph;
}

describe('BrewChooseGraphReferenceComponent - the rows of the selected tab', () => {
  let brews: Brew[];
  let graphs: Graph[];

  function create(): BrewChooseGraphReferenceComponent {
    const component = TestBed.runInInjectionContext(
      () => new BrewChooseGraphReferenceComponent(),
    );
    // No template in this test: the list and its scroller are not rendered.
    Object.defineProperty(component, 'content', {
      value: () => ({ scrollToTop: () => Promise.resolve() }) as IonContent,
    });
    Object.defineProperty(component, 'list', { value: () => undefined });
    component.brew = brew('current');
    component.ngOnInit();
    component.ionViewDidEnter();
    return component;
  }

  function shown(component: BrewChooseGraphReferenceComponent): string[] {
    return component.shownRows.map(component.rowKey);
  }

  beforeEach(() => {
    brews = [
      brew('older', false, 1),
      brew('newer', false, 2),
      brew('old', true),
    ];
    graphs = [];
    const settings = new Settings();
    TestBed.configureTestingModule({
      providers: [
        { provide: UIBrewStorage, useValue: { getAllEntries: () => brews } },
        { provide: UIGraphStorage, useValue: { getAllEntries: () => graphs } },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => settings },
        },
        { provide: Platform, useValue: { is: () => false } },
        { provide: ModalController, useValue: {} },
        { provide: UIGraphHelper, useValue: {} },
        { provide: UIAlert, useValue: {} },
        { provide: UIHelper, useValue: {} },
      ],
    });
  });

  it('shows the active brews, newest first, without open graphs', () => {
    const component = create();

    expect(component.brew_segment).toBe('brews-open');
    expect(shown(component)).toEqual(['brew-newer', 'brew-older']);
    expect(component.shownRows[0].brew).toBe(brews[1]);
  });

  it('shows the open graphs first when there are some', () => {
    graphs = [graph('mine'), graph('done', true)];

    const component = create();

    expect(component.brew_segment).toBe('graphs-open');
    expect(shown(component)).toEqual(['graph-mine']);
    expect(component.shownRows[0].graph).toBe(graphs[0]);
  });

  it('shows the rows of the tab chosen', () => {
    graphs = [graph('mine')];
    const component = create();

    component.brew_segment = 'brews-archive';
    component.segmentChanged();
    expect(shown(component)).toEqual(['brew-old']);

    component.brew_segment = 'brews-open';
    component.segmentChanged();
    expect(shown(component)).toEqual(['brew-newer', 'brew-older']);

    component.brew_segment = 'graphs-open';
    component.segmentChanged();
    expect(shown(component)).toEqual(['graph-mine']);
  });

  it('shows the brews found by the search', () => {
    const component = create();

    component.openBrewsFilterText = 'NEW';
    component.research();

    expect(shown(component)).toEqual(['brew-newer']);
  });
});
