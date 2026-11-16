import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { BEAN_SORT_AFTER } from '../../../enums/beans/beanSortAfter';
import { BEAN_SORT_ORDER } from '../../../enums/beans/beanSortOrder';
import { IBrew } from '../../../interfaces/brew/iBrew';
import { FakeStoreSource } from '../../../stores/core/__tests__/fake-store-source';
import { UIBeanHelper } from '../../uiBeanHelper';
import { UIBrewStorage } from '../../uiBrewStorage';
import { UIHelper } from '../../uiHelper';
import { BeanSortFilterHelperService } from '../bean-sort-filter-helper.service';

const DAY = 24 * 60 * 60;
/** 2026-03-01 12:00 local time, in seconds. */
const MARCH_1 = new Date(2026, 2, 1, 12).getTime() / 1000;

function bean(uuid: string, fields: Partial<Bean> = {}): Bean {
  const entry = new Bean();
  entry.config.uuid = uuid;
  Object.assign(entry, fields);
  return entry;
}

function storedBrew(beanUuid: string, at: number): object {
  const entry = new Brew();
  entry.bean = beanUuid;
  entry.config.unix_timestamp = at;
  return JSON.parse(JSON.stringify(entry)) as object;
}

describe('BeanSortFilterHelperService - sort by last use and by age', () => {
  let service: BeanSortFilterHelperService;
  let source: FakeStoreSource;
  let brewsOfBean: jasmine.Spy;

  const stored = [
    storedBrew('a', MARCH_1 + 5 * DAY),
    storedBrew('b', MARCH_1 + 9 * DAY),
    storedBrew('a', MARCH_1 + 2 * DAY),
    storedBrew('c', MARCH_1 + 5 * DAY),
    storedBrew('old', MARCH_1 + 20 * DAY),
    storedBrew('deleted', MARCH_1 + 30 * DAY),
  ];

  function sortedUuids(
    after: BEAN_SORT_AFTER,
    order: BEAN_SORT_ORDER,
    beans: Bean[],
  ): string[] {
    return service['manageSort'](
      { sort_after: after, sort_order: order },
      beans,
    ).map((entry: Bean) => entry.config.uuid);
  }

  beforeEach(async () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date((MARCH_1 + 40 * DAY) * 1000));

    source = new FakeStoreSource();
    // What the methods of `Bean` read: brew instances from the bean helper.
    const beanHelper = Object.create(UIBeanHelper.prototype) as UIBeanHelper;
    Object.assign(beanHelper, {
      allStoredBrews: [],
      uiBrewStorage: {
        getAllEntries: () =>
          source.entries.map((entry) => {
            const brew = new Brew();
            brew.initializeByObject(entry as IBrew);
            return brew;
          }),
      },
    });
    spyOn(UIBeanHelper, 'getInstance').and.returnValue(beanHelper);
    brewsOfBean = spyOn(beanHelper, 'getAllBrewsForThisBean').and.callThrough();

    TestBed.configureTestingModule({
      providers: [
        BeanSortFilterHelperService,
        { provide: UIBrewStorage, useValue: source },
        { provide: UIBeanHelper, useValue: beanHelper },
        { provide: UIHelper, useValue: {} },
        { provide: ModalController, useValue: {} },
      ],
    });
    service = TestBed.inject(BeanSortFilterHelperService);
    await source.load(stored);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  describe('recently used', () => {
    // Last use: a and c on day 5, b on day 9, the others never.
    const beans = () => [
      bean('unused1'),
      bean('c'),
      bean('b'),
      bean('a'),
      bean('unused2'),
    ];

    it('sorts ascending and keeps the order of beans used at the same time or never', () => {
      expect(
        sortedUuids(
          BEAN_SORT_AFTER.RECENTLY_USED,
          BEAN_SORT_ORDER.ASCENDING,
          beans(),
        ),
      ).toEqual(['unused1', 'unused2', 'c', 'a', 'b']);
    });

    it('sorts descending as the ascending order turned round', () => {
      expect(
        sortedUuids(
          BEAN_SORT_AFTER.RECENTLY_USED,
          BEAN_SORT_ORDER.DESCENDING,
          beans(),
        ),
      ).toEqual(['b', 'a', 'c', 'unused2', 'unused1']);
    });
  });

  describe('bean age', () => {
    const roasted = (daysBeforeMarch1: number) =>
      new Date((MARCH_1 - daysBeforeMarch1 * DAY) * 1000).toISOString();
    // Today is day 40. An archived bean stops ageing with its last brew.
    const beans = () => [
      bean('none'), // no roasting date: 0
      bean('b', { roastingDate: roasted(10) }), // 50
      bean('old', { roastingDate: roasted(10), finished: true }), // 30
      bean('a', { roastingDate: roasted(0) }), // 40
      bean('fresh', { roastingDate: roasted(-10), finished: true }), // 30
      bean('c', { roastingDate: roasted(0) }), // 40
    ];

    it('sorts ascending and keeps the order of beans of the same age', () => {
      expect(
        sortedUuids(
          BEAN_SORT_AFTER.BEAN_AGE,
          BEAN_SORT_ORDER.ASCENDING,
          beans(),
        ),
      ).toEqual(['none', 'old', 'fresh', 'a', 'c', 'b']);
    });

    it('sorts descending as the ascending order turned round', () => {
      expect(
        sortedUuids(
          BEAN_SORT_AFTER.BEAN_AGE,
          BEAN_SORT_ORDER.DESCENDING,
          beans(),
        ),
      ).toEqual(['b', 'c', 'a', 'fresh', 'old', 'none']);
    });
  });

  it('reads the brews once for a sort and does not go through them for each comparison', () => {
    const many = Array.from({ length: 200 }, (_, i) =>
      bean(`bean-${i}`, { finished: true, roastingDate: '2026-01-01' }),
    );
    source.change(
      many.map((entry, i) => storedBrew(entry.config.uuid, MARCH_1 + i * DAY)),
    );
    const read = spyOn(source, 'getRawEntries').and.callThrough();

    const byUse = sortedUuids(
      BEAN_SORT_AFTER.RECENTLY_USED,
      BEAN_SORT_ORDER.DESCENDING,
      [...many],
    );
    const byAge = sortedUuids(
      BEAN_SORT_AFTER.BEAN_AGE,
      BEAN_SORT_ORDER.DESCENDING,
      [...many],
    );

    expect(byUse[0]).toBe('bean-199');
    expect(byAge[0]).toBe('bean-199');
    expect(read).toHaveBeenCalledTimes(1);
    expect(brewsOfBean).not.toHaveBeenCalled();
  });
});
