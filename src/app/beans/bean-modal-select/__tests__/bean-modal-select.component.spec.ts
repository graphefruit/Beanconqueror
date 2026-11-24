import { TestBed } from '@angular/core/testing';

import { IonContent, ModalController } from '@ionic/angular';

import { Bean } from '../../../../classes/bean/bean';
import { Settings } from '../../../../classes/settings/settings';
import { BeanSortFilterHelperService } from '../../../../services/beanSortFilterHelper/bean-sort-filter-helper.service';
import { UIBeanHelper } from '../../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../../services/uiBeanStorage';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { BeanModalSelectComponent } from '../bean-modal-select.component';

function bean(name: string, state: 'open' | 'frozen' | 'archive'): Bean {
  const created = new Bean();
  created.name = name;
  created.config.uuid = name;
  created.finished = state === 'archive';
  if (state === 'frozen') {
    created.frozenDate = '2026-11-01T00:00:00.000Z';
  }
  return created;
}

/** The beans of a tab, narrowed by the search text, as the helper gives them. */
function beansOfTab(type: string, beans: Bean[], searchText: string): Bean[] {
  return beans.filter(
    (e) =>
      (type === 'archive'
        ? e.finished
        : !e.finished && e.isFrozen() === (type === 'frozen')) &&
      e.name.toLowerCase().includes(searchText),
  );
}

describe('BeanModalSelectComponent - the beans of the selected tab', () => {
  let beans: Bean[];
  let settings: Settings;

  function create(): BeanModalSelectComponent {
    const component = TestBed.runInInjectionContext(
      () => new BeanModalSelectComponent(),
    );
    // No template in this test: the list and its scroller are not rendered.
    Object.defineProperty(component, 'content', {
      value: () => ({ scrollToTop: () => Promise.resolve() }) as IonContent,
    });
    Object.defineProperty(component, 'list', { value: () => undefined });
    return component;
  }

  beforeEach(() => {
    beans = [
      bean('Ethiopia', 'open'),
      bean('Kenya', 'open'),
      bean('Brazil', 'frozen'),
      bean('Colombia', 'archive'),
    ];
    settings = new Settings();
    settings.freeze_coffee_beans = true;
    TestBed.configureTestingModule({
      providers: [
        { provide: UIBeanStorage, useValue: { getAllEntries: () => beans } },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => settings },
        },
        {
          provide: BeanSortFilterHelperService,
          useValue: { initializeBeansView: beansOfTab },
        },
        { provide: UIBeanHelper, useValue: {} },
        { provide: ModalController, useValue: {} },
      ],
    });
  });

  it('shows the open beans first', () => {
    const component = create();

    expect(component.bean_segment).toBe('open');
    expect(component.shownBeans.map((e) => e.name)).toEqual([
      'Ethiopia',
      'Kenya',
    ]);
  });

  it('shows the beans of the tab chosen', () => {
    const component = create();

    component.bean_segment = 'frozen';
    component.segmentChanged();
    expect(component.shownBeans.map((e) => e.name)).toEqual(['Brazil']);

    component.bean_segment = 'archive';
    component.segmentChanged();
    expect(component.shownBeans.map((e) => e.name)).toEqual(['Colombia']);

    component.bean_segment = 'open';
    component.segmentChanged();
    expect(component.shownBeans.map((e) => e.name)).toEqual([
      'Ethiopia',
      'Kenya',
    ]);
  });

  it('opens on the frozen beans when there is no open one', () => {
    beans = beans.filter((e) => e.finished || e.isFrozen());

    const component = create();

    expect(component.bean_segment).toBe('frozen');
    expect(component.shownBeans.map((e) => e.name)).toEqual(['Brazil']);
  });

  it('narrows only the tab searched in, and keeps its search text', () => {
    const component = create();

    component.uiSearchText = 'KEN';
    component.research();
    expect(component.shownBeans.map((e) => e.name)).toEqual(['Kenya']);

    component.bean_segment = 'archive';
    component.segmentChanged();
    expect(component.uiSearchText).toBe('');
    expect(component.shownBeans.map((e) => e.name)).toEqual(['Colombia']);

    component.bean_segment = 'open';
    component.segmentChanged();
    expect(component.uiSearchText).toBe('KEN');
    expect(component.shownBeans.map((e) => e.name)).toEqual(['Kenya']);
  });

  it('keeps a bean tapped before the modal has entered', () => {
    const component = create();
    Object.assign(component, { multiple: false, selectedValues: ['Ethiopia'] });

    component.ngOnInit();
    expect(component.radioSelection).toBe('Ethiopia');
    component.radioSelection = 'Kenya';
    component.ionViewDidEnter();

    expect(component.radioSelection).toBe('Kenya');
  });

  it('keeps beans ticked before the modal has entered', () => {
    const component = create();
    Object.assign(component, { multiple: true, selectedValues: ['Ethiopia'] });

    component.ngOnInit();
    expect(component.multipleSelection).toEqual({
      Ethiopia: true,
      Kenya: false,
      Brazil: false,
      Colombia: false,
    });
    component.multipleSelection['Kenya'] = true;
    component.ionViewDidEnter();

    expect(component.multipleSelection['Kenya']).toBe(true);
  });

  it('keys a row by the bean', () => {
    const component = create();

    expect(component.beanKey(component.shownBeans[1])).toBe('Kenya');
  });
});
