import { TestBed } from '@angular/core/testing';

import { TranslateService } from '@ngx-translate/core';
import { Chart } from 'chart.js';

import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { Config } from '../../../classes/objectConfig/objectConfig';
import { Settings } from '../../../classes/settings/settings';
import { CurrencyService } from '../../../services/currencyService/currency.service';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIHelper } from '../../../services/uiHelper';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIStatistic } from '../../../services/uiStatistic';
import {
  createBean,
  createEmptyBeanInformation,
} from '../../../test-utils/bean-test-helpers';
import {
  createMockTranslateService,
  createMockUISettingsStorage,
} from '../../../test-utils/mock-services';
import { StatisticPage } from '../statistic.page';

describe('StatisticPage - Beans Average Rating by Country', () => {
  let component: StatisticPage;
  let beanStorageSpy: jasmine.SpyObj<UIBeanStorage>;
  let brewStorageSpy: jasmine.SpyObj<UIBrewStorage>;
  let settingsStorageSpy: jasmine.SpyObj<UISettingsStorage>;
  let canvas: HTMLCanvasElement;
  let settings: Settings;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    settings = new Settings();
    settings.bean_rating = 5;
    settings.brew_rating = 5;

    beanStorageSpy = jasmine.createSpyObj('UIBeanStorage', ['getAllEntries']);
    brewStorageSpy = jasmine.createSpyObj('UIBrewStorage', ['getAllEntries']);
    settingsStorageSpy = createMockUISettingsStorage();
    settingsStorageSpy.getSettings.and.returnValue(settings);

    const translateSpy = createMockTranslateService({
      PAGE_STATISTICS_AVG_RATING: 'Average Rating',
    });
    const currencySpy = jasmine.createSpyObj('CurrencyService', [
      'getActualCurrencySymbol',
    ]);
    const statisticSpy = jasmine.createSpyObj('UIStatistic', [
      'getMillsCount',
      'getPreparationsCount',
    ]);
    const millStorageSpy = jasmine.createSpyObj('UIMillStorage', [
      'getAllEntries',
    ]);
    const prepStorageSpy = jasmine.createSpyObj('UIPreparationStorage', [
      'getAllEntries',
    ]);

    const helperSpy = jasmine.createSpyObj('UIHelper', ['toFixedIfNecessary']);
    helperSpy.toFixedIfNecessary.and.callFake((val: number, dp: number) => {
      const parsedFloat = parseFloat(val as any);
      if (isNaN(parsedFloat)) {
        return 0;
      }
      return +parsedFloat.toFixed(dp);
    });

    TestBed.configureTestingModule({
      providers: [
        StatisticPage,
        { provide: UIHelper, useValue: helperSpy },
        { provide: UIBeanStorage, useValue: beanStorageSpy },
        { provide: UIBrewStorage, useValue: brewStorageSpy },
        { provide: UISettingsStorage, useValue: settingsStorageSpy },
        { provide: TranslateService, useValue: translateSpy },
        { provide: CurrencyService, useValue: currencySpy },
        { provide: UIStatistic, useValue: statisticSpy },
        { provide: UIMillStorage, useValue: millStorageSpy },
        { provide: UIPreparationStorage, useValue: prepStorageSpy },
      ],
    });

    component = TestBed.inject(StatisticPage);
    component.beansAvgRatingByCountryChart = { nativeElement: canvas };
  });

  afterEach(() => {
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
      existingChart.destroy();
    }
  });

  it('should calculate average bean rating by country using bean.rating', () => {
    const bean1 = createBean({
      rating: 4.5,
      bean_information: [
        { ...createEmptyBeanInformation(), country: 'Colombia' },
      ],
    });
    const bean2 = createBean({
      rating: 3.5,
      bean_information: [
        { ...createEmptyBeanInformation(), country: 'Colombia' },
      ],
    });
    const bean3 = createBean({
      rating: 5.0,
      bean_information: [
        { ...createEmptyBeanInformation(), country: 'Ethiopia' },
      ],
    });

    beanStorageSpy.getAllEntries.and.returnValue([bean1, bean2, bean3]);
    brewStorageSpy.getAllEntries.and.returnValue([]);

    component['__loadAvgBeanRatingByCountryChart']();

    const chart = Chart.getChart(canvas);
    expect(chart).toBeDefined();
    expect((chart.config as any).type).toBe('radar');
    expect(chart.data.labels).toEqual(['Colombia', 'Ethiopia']);
    expect(chart.data.datasets[0].data).toEqual([4, 5]);
  });

  it('should fall back to rated brews when bean.rating is 0', () => {
    const beanUuid = 'uuid-kenya-1';
    const bean = createBean({
      rating: 0,
      config: { ...new Config(), uuid: beanUuid },
      bean_information: [{ ...createEmptyBeanInformation(), country: 'Kenya' }],
    });

    const brew1 = { bean: beanUuid, rating: 4 } as Brew;
    const brew2 = { bean: beanUuid, rating: 5 } as Brew;

    beanStorageSpy.getAllEntries.and.returnValue([bean]);
    brewStorageSpy.getAllEntries.and.returnValue([brew1, brew2]);

    component['__loadAvgBeanRatingByCountryChart']();

    const chart = Chart.getChart(canvas);
    expect(chart).toBeDefined();
    expect(chart.data.labels).toEqual(['Kenya']);
    expect(chart.data.datasets[0].data).toEqual([4.5]);
  });

  it('should not count unrated brews (rating === 0) when computing brew average', () => {
    const beanUuid = 'uuid-brazil-1';
    const bean = createBean({
      rating: 0,
      config: { ...new Config(), uuid: beanUuid },
      bean_information: [
        { ...createEmptyBeanInformation(), country: 'Brazil' },
      ],
    });

    const brew1 = { bean: beanUuid, rating: 4 } as Brew;
    const brewUnrated = { bean: beanUuid, rating: 0 } as Brew;

    beanStorageSpy.getAllEntries.and.returnValue([bean]);
    brewStorageSpy.getAllEntries.and.returnValue([brew1, brewUnrated]);

    component['__loadAvgBeanRatingByCountryChart']();

    const chart = Chart.getChart(canvas);
    expect(chart).toBeDefined();
    expect(chart.data.labels).toEqual(['Brazil']);
    expect(chart.data.datasets[0].data).toEqual([4]);
  });

  it('should exclude countries that have no ratings at all', () => {
    const beanRated = createBean({
      rating: 4.5,
      bean_information: [
        { ...createEmptyBeanInformation(), country: 'Colombia' },
      ],
    });
    const beanUnrated = createBean({
      rating: 0,
      config: { ...new Config(), uuid: 'uuid-guatemala-1' },
      bean_information: [
        { ...createEmptyBeanInformation(), country: 'Guatemala' },
      ],
    });

    beanStorageSpy.getAllEntries.and.returnValue([beanRated, beanUnrated]);
    brewStorageSpy.getAllEntries.and.returnValue([]);

    component['__loadAvgBeanRatingByCountryChart']();

    const chart = Chart.getChart(canvas);
    expect(chart).toBeDefined();
    expect(chart.data.labels).toEqual(['Colombia']);
    expect(chart.data.labels).not.toContain('Guatemala');
    expect(chart.data.datasets[0].data).toEqual([4.5]);
  });

  it('should set radial scale with min: 0 and suggestedMax based on bean_rating settings', () => {
    settings.bean_rating = 10;
    settingsStorageSpy.getSettings.and.returnValue(settings);

    const bean = createBean({
      rating: 8.5,
      bean_information: [
        { ...createEmptyBeanInformation(), country: 'Ethiopia' },
      ],
    });

    beanStorageSpy.getAllEntries.and.returnValue([bean]);
    brewStorageSpy.getAllEntries.and.returnValue([]);

    component['__loadAvgBeanRatingByCountryChart']();

    const chart = Chart.getChart(canvas);
    const rScale = (chart.config.options as any).scales.r;
    expect(rScale.beginAtZero).toBeTrue();
    expect(rScale.min).toBe(0);
    expect(rScale.suggestedMax).toBe(10);
  });

  it('should destroy existing chart instance on the canvas when reloaded', () => {
    const bean = createBean({
      rating: 4,
      bean_information: [
        { ...createEmptyBeanInformation(), country: 'Colombia' },
      ],
    });

    beanStorageSpy.getAllEntries.and.returnValue([bean]);
    brewStorageSpy.getAllEntries.and.returnValue([]);

    component['__loadAvgBeanRatingByCountryChart']();
    const firstChart = Chart.getChart(canvas);
    expect(firstChart).toBeDefined();

    spyOn(firstChart, 'destroy').and.callThrough();

    component['__loadAvgBeanRatingByCountryChart']();
    expect(firstChart.destroy).toHaveBeenCalled();

    const secondChart = Chart.getChart(canvas);
    expect(secondChart).toBeDefined();
  });
});
