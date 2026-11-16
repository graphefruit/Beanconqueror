import { createEnvironmentInjector, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TranslateService } from '@ngx-translate/core';
import { Chart } from 'chart.js';
import moment from 'moment';
import { Subject } from 'rxjs';

import { Brew } from '../../../classes/brew/brew';
import { Settings } from '../../../classes/settings/settings';
import { CurrencyService } from '../../../services/currencyService/currency.service';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIHelper } from '../../../services/uiHelper';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIStatistic } from '../../../services/uiStatistic';
import { createMockTranslateService } from '../../../test-utils/mock-services';
import { StatisticPage } from '../statistic.page';

function brew(date: string, fields: Partial<Brew>): Brew {
  const entry = new Brew();
  Object.assign(entry, fields);
  entry.config.unix_timestamp = moment(date).unix();
  return entry;
}

const GENERAL_NUMBERS = [
  'getMillsCount',
  'getPreparationsCount',
  'getTotalGround',
  'getSpentMoneyForCoffeeBeans',
  'getBrewsDrunk',
  'getTotalDrunk',
  'brewedTime',
  'photosTaken',
] as const;

describe('StatisticPage - numbers and month groups are worked out once', () => {
  let page: StatisticPage;
  let statistic: jasmine.SpyObj<UIStatistic>;
  let canvases: Record<string, HTMLCanvasElement>;
  let events: Record<'brew' | 'bean' | 'mill' | 'preparation', Subject<void>>;

  function chartData(name: string) {
    const { labels, datasets } = Chart.getChart(canvases[name]).data;
    return { labels, data: datasets.map((dataset) => dataset.data) };
  }

  beforeEach(() => {
    jasmine.clock().install();
    statistic = jasmine.createSpyObj<UIStatistic>('UIStatistic', [
      'setDateRange',
      ...GENERAL_NUMBERS,
    ]);
    statistic.getMillsCount.and.returnValue(2);
    statistic.getPreparationsCount.and.returnValue(3);
    statistic.getTotalGround.and.returnValue(1.25);
    statistic.getSpentMoneyForCoffeeBeans.and.returnValue(99.5);
    statistic.getBrewsDrunk.and.returnValue(5);
    statistic.getTotalDrunk.and.returnValue(0.75);
    statistic.brewedTime.and.returnValue('00:10:00');
    statistic.photosTaken.and.returnValue(4);

    events = {
      brew: new Subject(),
      bean: new Subject(),
      mill: new Subject(),
      preparation: new Subject(),
    };

    const brews = [
      brew('2026-03-20T10:00:00', {
        mill: 'm1',
        grind_weight: 18,
        brew_quantity: 250,
      }),
      brew('2026-02-10T10:00:00', {
        mill: 'm2',
        grind_weight: 15.5,
        brew_quantity: 300,
        brew_beverage_quantity: 36,
      }),
      brew('2026-03-20T18:00:00', {
        mill: 'm2',
        grind_weight: 17,
        brew_quantity: 40,
      }),
      brew('2026-03-02T08:00:00', {
        mill: 'm1',
        grind_weight: 0.5,
        brew_quantity: 200,
      }),
    ];

    TestBed.configureTestingModule({
      providers: [
        StatisticPage,
        { provide: UIStatistic, useValue: statistic },
        {
          provide: UIHelper,
          useValue: {
            formateDate: (at: number, format: string) =>
              moment.unix(at).locale('en').format(format),
            getUnixTimestamp: () => moment('2026-03-25T12:00:00').unix(),
          },
        },
        {
          provide: UIBrewStorage,
          useValue: {
            getAllEntries: () => brews,
            attachOnEvent: () => events.brew,
          },
        },
        {
          provide: UIBeanStorage,
          useValue: {
            getAllEntries: () => [],
            attachOnEvent: () => events.bean,
          },
        },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => new Settings() },
        },
        {
          provide: UIMillStorage,
          useValue: {
            getAllEntries: () => [],
            getMillNameByUUID: (uuid: string) => `Mill ${uuid}`,
            attachOnEvent: () => events.mill,
          },
        },
        {
          provide: UIPreparationStorage,
          useValue: { attachOnEvent: () => events.preparation },
        },
        { provide: TranslateService, useValue: createMockTranslateService({}) },
        {
          provide: CurrencyService,
          useValue: { getActualCurrencySymbol: () => '€' },
        },
      ],
    });
    page = TestBed.inject(StatisticPage);

    canvases = {};
    for (const name of [
      'drinkingChart',
      'brewChart',
      'brewsPerDayChart',
      'grindingChart',
      'grinderUsageTimelineChart',
    ] as const) {
      canvases[name] = document.createElement('canvas');
      page[name] = { nativeElement: canvases[name] };
    }
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    for (const canvas of Object.values(canvases)) {
      Chart.getChart(canvas)?.destroy();
    }
  });

  describe('charts', () => {
    it('draws the brew charts by month and by day', () => {
      page.loadBrewCharts();
      jasmine.clock().tick(250);

      expect(chartData('drinkingChart')).toEqual({
        labels: ['February - 2026', 'March - 2026'],
        data: [[0.04, 0.49]],
      });
      expect(chartData('brewChart')).toEqual({
        labels: ['February - 2026', 'March - 2026'],
        data: [[1, 3]],
      });
      expect(chartData('brewsPerDayChart')).toEqual({
        labels: ['10.02.26', '02.03.26', '20.03.26'],
        data: [[1, 1, 2]],
      });
    });

    it('draws the grinder charts by month', () => {
      page.loadGrinderCharts();
      jasmine.clock().tick(250);

      expect(chartData('grindingChart')).toEqual({
        labels: ['February - 2026', 'March - 2026'],
        data: [[15.5, 35.5]],
      });
      expect(chartData('grinderUsageTimelineChart')).toEqual({
        labels: ['February - 2026', 'March - 2026'],
        data: [
          [0, 2],
          [1, 1],
        ],
      });
    });

    it('groups the brews by month once for the charts of a segment', () => {
      const byMonth = spyOn(
        page as unknown as { __getBrewsSortedForMonth(): unknown },
        '__getBrewsSortedForMonth',
      ).and.callThrough();

      page.loadBrewCharts();
      jasmine.clock().tick(250);
      expect(byMonth).toHaveBeenCalledTimes(1);

      page.loadGrinderCharts();
      jasmine.clock().tick(250);
      expect(byMonth).toHaveBeenCalledTimes(2);
    });
  });

  describe('numbers of the General tab', () => {
    const numbers = {
      mills: 2,
      preparations: 3,
      totalGround: 1.25,
      spentMoney: 99.5,
      brewsDrunk: 5,
      totalDrunk: 0.75,
      brewedTime: '00:10:00',
      photosTaken: 4,
      currencySymbol: '€',
    };

    it('are worked out once when the page is entered, for all time', () => {
      page.ionViewWillEnter();

      expect(page.general).toEqual(numbers);
      for (const name of GENERAL_NUMBERS) {
        expect(statistic[name].calls.count()).withContext(name).toBe(1);
      }
    });

    it('are there for the first render, before the page is entered', () => {
      page.ngOnInit();

      expect(page.general).toEqual(numbers);
    });

    it('are worked out again for another range, after the range is set', () => {
      page.ionViewWillEnter();
      const calls: string[] = [];
      statistic.setDateRange.and.callFake((range) => {
        calls.push(`range ${range.mode}`);
      });
      statistic.getBrewsDrunk.and.callFake(() => {
        calls.push('brews');
        return 1;
      });

      page.onRangeModeChange('THIS_MONTH');

      expect(page.general).toEqual({ ...numbers, brewsDrunk: 1 });
      expect(calls).toEqual(['range THIS_MONTH', 'brews']);
    });

    it('are worked out again each time the page is entered', () => {
      page.ionViewWillEnter();
      statistic.getBrewsDrunk.and.returnValue(6);

      page.ionViewWillEnter();

      expect(page.general).toEqual({ ...numbers, brewsDrunk: 6 });
    });

    for (const storage of ['brew', 'bean', 'mill', 'preparation'] as const) {
      it(`follow a change of the ${storage}s while the page stays open`, () => {
        page.ionViewWillEnter();
        page.onRangeModeChange('THIS_MONTH');
        statistic.getBrewsDrunk.and.returnValue(6);
        statistic.setDateRange.calls.reset();

        events[storage].next();

        expect(page.general).toEqual({ ...numbers, brewsDrunk: 6 });
        expect(page.rangeMode).toBe('THIS_MONTH');
        expect(statistic.setDateRange.calls.count()).toBe(0);
      });
    }

    it('stop following the storages when the page is destroyed', () => {
      const injector = createEnvironmentInjector(
        [StatisticPage],
        TestBed.inject(EnvironmentInjector),
      );
      injector.get(StatisticPage);
      events.brew.next();
      expect(statistic.getBrewsDrunk.calls.count()).toBe(2);

      // The page of the test module goes on listening.
      injector.destroy();
      statistic.getBrewsDrunk.calls.reset();
      events.brew.next();

      expect(statistic.getBrewsDrunk.calls.count()).toBe(1);
    });
  });
});
