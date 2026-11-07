import { ChangeDetectorRef, ElementRef } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { TranslateService } from '@ngx-translate/core';
import { Chart } from 'chart.js';
import moment from 'moment';
import { Subject } from 'rxjs';

import BaristamodeBrew from '../../../../classes/brew/baristamodeBrew';
import { UIBaristamodeBrewStorage } from '../../../../services/uiBaristamodeBrewStorage';
import { BaristamodeStatisticsPage } from '../baristamode-statistics.page';

describe('BaristamodeStatisticsPage', () => {
  let page: BaristamodeStatisticsPage;
  let brews: BaristamodeBrew[];
  let storageChanges: Subject<void>;
  let originalColor: string;

  function brew(date: moment.Moment, profile = 'P1'): BaristamodeBrew {
    const entry = new BaristamodeBrew();
    entry.config.unix_timestamp = date.unix();
    entry.pressure_profile = profile;
    entry.desired_beverage_quantity = 36;
    entry.brew_beverage_quantity = 36;
    entry.water_volume_intake = 50;
    entry.brew_time = 25;
    return entry;
  }

  function chart(element: ElementRef<HTMLCanvasElement>): Chart {
    const instance = Chart.getChart(element.nativeElement);
    if (!instance) {
      throw new Error('Expected statistics chart to be rendered');
    }
    return instance;
  }

  beforeEach(() => {
    originalColor = document.body.style.getPropertyValue('--ion-text-color');
    document.body.style.setProperty('--ion-text-color', '#282013');
    brews = [brew(moment()), brew(moment().subtract(18, 'months'), 'M')];
    storageChanges = new Subject<void>();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UIBaristamodeBrewStorage,
          useValue: {
            getAllEntries: () => brews,
            attachOnEvent: () => storageChanges,
          },
        },
        {
          provide: TranslateService,
          useValue: { instant: (key: string) => key },
        },
        {
          provide: ChangeDetectorRef,
          useValue: { detectChanges: jasmine.createSpy('detectChanges') },
        },
      ],
    });
    page = TestBed.runInInjectionContext(() => new BaristamodeStatisticsPage());
    page.accuracyChart = new ElementRef(document.createElement('canvas'));
    page.profileTimelineChart = new ElementRef(
      document.createElement('canvas'),
    );
    page.waterBeverageChart = new ElementRef(document.createElement('canvas'));
  });

  afterEach(() => {
    page.ngOnDestroy();
    if (originalColor) {
      document.body.style.setProperty('--ion-text-color', originalColor);
    } else {
      document.body.style.removeProperty('--ion-text-color');
    }
  });

  it('includes old brews in every All Time chart and its metrics', fakeAsync(() => {
    page.segment = 'ALL_TIME';
    page.ionViewWillEnter();
    tick(150);

    expect(page.activeBrewsCount).toBe(2);
    expect(page.activeHitRate).toBe(100);
    expect(chart(page.accuracyChart).data.datasets[0].data).toEqual([
      2, 0, 0, 0,
    ]);
    const timeline = chart(page.profileTimelineChart);
    expect(timeline.data.labels?.length).toBe(19);
    expect(timeline.data.labels?.[0]).toBe(
      moment().subtract(18, 'months').format('MMM YY'),
    );
    expect(timeline.data.datasets.map((dataset) => dataset.label)).toEqual([
      'P1',
      'M',
    ]);
    expect(timeline.data.datasets[1].data[0]).toBe(1);
    expect(timeline.data.datasets[0].data[18]).toBe(1);
    expect(chart(page.waterBeverageChart).data.labels).toEqual(['P1', 'M']);
  }));

  for (const [period, buckets] of [
    ['DAILY', 14],
    ['WEEKLY', 8],
    ['MONTHLY', 6],
  ] as const) {
    it(`preserves the ${period} window after switching from All Time`, fakeAsync(() => {
      page.segment = 'ALL_TIME';
      page.ionViewWillEnter();
      tick(150);
      page.segment = period;
      page.onSegmentChange();
      tick(150);

      expect(page.activeBrewsCount).toBe(1);
      expect(chart(page.profileTimelineChart).data.labels?.length).toBe(
        buckets,
      );
      expect(chart(page.waterBeverageChart).data.labels).toEqual(['P1']);
    }));
  }

  for (const color of ['#282013', '#d3d3d3']) {
    it(`uses resolved theme colour ${color} for all chart text`, fakeAsync(() => {
      document.body.style.setProperty('--ion-text-color', color);
      page.ionViewWillEnter();
      tick(150);

      for (const element of [
        page.accuracyChart,
        page.profileTimelineChart,
        page.waterBeverageChart,
      ]) {
        const options = chart(element).options;
        expect(options.plugins?.legend?.labels?.color).toBe(color);
        for (const scale of Object.values(options.scales ?? {})) {
          expect(scale?.ticks?.color).toBe(color);
          if (scale && 'title' in scale && scale.title?.display) {
            expect(scale.title.color).toBe(color);
          }
        }
      }
    }));
  }

  it('refreshes chart colours when the theme changes while open', async () => {
    page.ionViewWillEnter();
    await new Promise((resolve) => setTimeout(resolve, 160));
    document.body.style.setProperty('--ion-text-color', '#d3d3d3');
    document.documentElement.classList.toggle('barista-statistics-theme-test');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      chart(page.accuracyChart).options.plugins?.legend?.labels?.color,
    ).toBe('#d3d3d3');
    page.ionViewWillLeave();
    document.documentElement.classList.toggle('barista-statistics-theme-test');
  });

  it('resets active metrics and removes charts when storage becomes empty', fakeAsync(() => {
    page.segment = 'ALL_TIME';
    page.ionViewWillEnter();
    tick(150);
    brews = [];
    storageChanges.next();
    tick(150);

    expect(page.totalBrewsCount).toBe(0);
    expect(page.activeBrewsCount).toBe(0);
    expect(page.activeHitRate).toBe(0);
    expect(Chart.getChart(page.accuracyChart.nativeElement)).toBeUndefined();
  }));

  it('cancels pending rendering and storage updates when leaving', fakeAsync(() => {
    page.ionViewWillEnter();
    page.ionViewWillLeave();
    storageChanges.next();
    tick(150);
    expect(Chart.getChart(page.accuracyChart.nativeElement)).toBeUndefined();
  }));
});
