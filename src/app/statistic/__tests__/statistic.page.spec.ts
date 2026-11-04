import { TestBed } from '@angular/core/testing';

import { TranslateService } from '@ngx-translate/core';
import { Chart } from 'chart.js';

import { Brew } from '../../../classes/brew/brew';
import { Mill } from '../../../classes/mill/mill';
import { Config } from '../../../classes/objectConfig/objectConfig';
import { Preparation } from '../../../classes/preparation/preparation';
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
      'setDateRange',
    ]);
    const millStorageSpy = jasmine.createSpyObj('UIMillStorage', [
      'getAllEntries',
      'getMillNameByUUID',
    ]);
    millStorageSpy.getMillNameByUUID.and.callFake((id: string) => `Mill-${id}`);
    const prepStorageSpy = jasmine.createSpyObj('UIPreparationStorage', [
      'getAllEntries',
      'getPreparationNameByUUID',
    ]);
    prepStorageSpy.getPreparationNameByUUID.and.callFake(
      (id: string) => `Prep-${id}`,
    );

    const helperSpy = jasmine.createSpyObj('UIHelper', [
      'toFixedIfNecessary',
      'formateDate',
    ]);
    helperSpy.toFixedIfNecessary.and.callFake((val: number, dp: number) => {
      const parsedFloat = parseFloat(val as any);
      if (isNaN(parsedFloat)) {
        return 0;
      }
      return +parsedFloat.toFixed(dp);
    });
    helperSpy.formateDate.and.callFake((ts: number, fmt: string) => {
      return fmt === 'MMMM' ? 'May' : '2026';
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

  describe('Custom date range filtering', () => {
    it('should switch to CUSTOM mode and apply range on onRangeModeChange("CUSTOM")', () => {
      const uiStatistic = TestBed.inject(UIStatistic);

      component.customStart = '2026-05-01';
      component.customEnd = '2026-05-31';

      component.onRangeModeChange('CUSTOM');

      expect(component.rangeMode).toBe('CUSTOM');
      expect(component.dateRange.mode).toBe('CUSTOM');
      expect(uiStatistic.setDateRange).toHaveBeenCalledWith(
        component.dateRange,
      );
    });

    it('should update customStart, apply range and dismiss popover on onCustomStartChanged', () => {
      const uiStatistic = TestBed.inject(UIStatistic);
      const popoverSpy = jasmine.createSpyObj('IonPopover', ['dismiss']);

      component.customStart = '2026-10-01';
      component.customEnd = '2026-10-31';

      component.onCustomStartChanged(
        { detail: { value: '2026-08-15' } },
        popoverSpy,
      );

      expect(component.customStart).toBe('2026-08-15');
      expect(component.dateRange.mode).toBe('CUSTOM');
      expect(uiStatistic.setDateRange).toHaveBeenCalledWith(
        component.dateRange,
      );
      expect(popoverSpy.dismiss).toHaveBeenCalled();
    });

    it('should update customEnd, apply range and dismiss popover on onCustomEndChanged', () => {
      const uiStatistic = TestBed.inject(UIStatistic);
      const popoverSpy = jasmine.createSpyObj('IonPopover', ['dismiss']);

      component.customStart = '2026-10-01';
      component.customEnd = '2026-10-31';

      component.onCustomEndChanged(
        { detail: { value: '2026-11-15' } },
        popoverSpy,
      );

      expect(component.customEnd).toBe('2026-11-15');
      expect(component.dateRange.mode).toBe('CUSTOM');
      expect(uiStatistic.setDateRange).toHaveBeenCalledWith(
        component.dateRange,
      );
      expect(popoverSpy.dismiss).toHaveBeenCalled();
    });

    it('should swap start and end if customStart is after customEnd', () => {
      component.customStart = '2026-10-31';
      component.customEnd = '2026-10-01';

      component.__applyCustomRange();

      expect(component.dateRange.start).toBeLessThan(component.dateRange.end);
    });
  });

  describe('Archived preparation methods and grinders filtering', () => {
    let prep1: Preparation;
    let prep2: Preparation;
    let mill1: Mill;
    let mill2: Mill;
    let brew1: Brew;
    let brew2: Brew;
    let prepCanvas: HTMLCanvasElement;
    let prepTimelineCanvas: HTMLCanvasElement;
    let grinderTimelineCanvas: HTMLCanvasElement;

    beforeEach(() => {
      prepCanvas = document.createElement('canvas');
      prepTimelineCanvas = document.createElement('canvas');
      grinderTimelineCanvas = document.createElement('canvas');

      component.preparationUsageChart = { nativeElement: prepCanvas };
      component.preparationUsageTimelineChart = {
        nativeElement: prepTimelineCanvas,
      };
      component.grinderUsageTimelineChart = {
        nativeElement: grinderTimelineCanvas,
      };

      prep1 = new Preparation();
      prep1.config.uuid = 'p1';
      prep1.name = 'V60';
      prep1.finished = false;

      prep2 = new Preparation();
      prep2.config.uuid = 'p2';
      prep2.name = 'Aeropress';
      prep2.finished = true;

      mill1 = new Mill();
      mill1.config.uuid = 'm1';
      mill1.name = 'Comandante';
      mill1.finished = false;

      mill2 = new Mill();
      mill2.config.uuid = 'm2';
      mill2.name = 'Niche';
      mill2.finished = true;

      const prepStorage = TestBed.inject(
        UIPreparationStorage,
      ) as jasmine.SpyObj<UIPreparationStorage>;
      prepStorage.getAllEntries.and.returnValue([prep1, prep2]);

      const millStorage = TestBed.inject(
        UIMillStorage,
      ) as jasmine.SpyObj<UIMillStorage>;
      millStorage.getAllEntries.and.returnValue([mill1, mill2]);

      brew1 = new Brew();
      brew1.config.uuid = 'b1';
      brew1.config.unix_timestamp = 1600000000;
      brew1.method_of_preparation = 'p1';
      brew1.mill = 'm1';

      brew2 = new Brew();
      brew2.config.uuid = 'b2';
      brew2.config.unix_timestamp = 1600000000;
      brew2.method_of_preparation = 'p2';
      brew2.mill = 'm2';

      brewStorageSpy.getAllEntries.and.returnValue([brew1, brew2]);
    });

    afterEach(() => {
      [prepCanvas, prepTimelineCanvas, grinderTimelineCanvas].forEach((c) => {
        const chart = Chart.getChart(c);
        if (chart) {
          chart.destroy();
        }
      });
    });

    it('should include archived preparations in preparation usage pie chart when show_archived_preparations is true', () => {
      settings.statistics.show_archived_preparations = true;

      (component as any).__loadPreparationUsageChart();

      const chart = Chart.getChart(prepCanvas);
      expect(chart).toBeDefined();
      expect(chart.data.labels).toEqual(['Prep-p1', 'Prep-p2']);
      expect(chart.data.datasets[0].data).toEqual([1, 1]);
    });

    it('should exclude archived preparations from preparation usage pie chart when show_archived_preparations is false', () => {
      settings.statistics.show_archived_preparations = false;

      (component as any).__loadPreparationUsageChart();

      const chart = Chart.getChart(prepCanvas);
      expect(chart).toBeDefined();
      expect(chart.data.labels).toEqual(['Prep-p1']);
      expect(chart.data.datasets[0].data).toEqual([1]);
    });

    it('should include archived preparations in preparation usage timeline when show_archived_preparations is true', () => {
      settings.statistics.show_archived_preparations = true;

      (component as any).__loadPreparationUsageTimelineChart();

      const chart = Chart.getChart(prepTimelineCanvas);
      expect(chart).toBeDefined();
      expect(chart.data.datasets.length).toBe(2);
      expect(chart.data.datasets.map((d: any) => d.label)).toEqual([
        'Prep-p1',
        'Prep-p2',
      ]);
    });

    it('should exclude archived preparations from preparation usage timeline when show_archived_preparations is false', () => {
      settings.statistics.show_archived_preparations = false;

      (component as any).__loadPreparationUsageTimelineChart();

      const chart = Chart.getChart(prepTimelineCanvas);
      expect(chart).toBeDefined();
      expect(chart.data.datasets.length).toBe(1);
      expect(chart.data.datasets[0].label).toBe('Prep-p1');
    });

    it('should include archived grinders in grinder usage timeline when show_archived_mills is true', () => {
      settings.statistics.show_archived_mills = true;

      (component as any).__loadGrinderUsageTimelineChart();

      const chart = Chart.getChart(grinderTimelineCanvas);
      expect(chart).toBeDefined();
      expect(chart.data.datasets.length).toBe(2);
      expect(chart.data.datasets.map((d: any) => d.label)).toEqual([
        'Mill-m1',
        'Mill-m2',
      ]);
    });

    it('should exclude archived grinders from grinder usage timeline when show_archived_mills is false', () => {
      settings.statistics.show_archived_mills = false;

      (component as any).__loadGrinderUsageTimelineChart();

      const chart = Chart.getChart(grinderTimelineCanvas);
      expect(chart).toBeDefined();
      expect(chart.data.datasets.length).toBe(1);
      expect(chart.data.datasets[0].label).toBe('Mill-m1');
    });
  });
});
