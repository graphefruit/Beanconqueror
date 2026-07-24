import { DecimalPipe } from '@angular/common';
import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCol,
  IonContent,
  IonDatetime,
  IonDatetimeButton,
  IonHeader,
  IonLabel,
  IonMenuButton,
  IonPopover,
  IonRow,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular/standalone';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Chart } from 'chart.js';
import currencyToSymbolMap from 'currency-symbol-map/map';
import Gradient from 'javascript-color-gradient';
import moment from 'moment';

import { Bean } from '../../classes/bean/bean';
import { Brew } from '../../classes/brew/brew';
import { BrewView } from '../../classes/brew/brewView';
import { HeaderComponent } from '../../components/header/header.component';
import { IBrew } from '../../interfaces/brew/iBrew';
import { CurrencyService } from '../../services/currencyService/currency.service';
import {
  filterBeansByRange,
  filterByConfigTimestamp,
  getDefaultStatisticDateRange,
  IStatisticDateRange,
  resolveQuickRange,
  STATISTIC_RANGE_MODE,
} from '../../services/statistic/statistic-date-range';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIHelper } from '../../services/uiHelper';
import { UIMillStorage } from '../../services/uiMillStorage';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIStatistic } from '../../services/uiStatistic';

@Component({
  selector: 'statistic',
  templateUrl: './statistic.page.html',
  styleUrls: ['./statistic.page.scss'],
  imports: [
    FormsModule,
    DecimalPipe,
    TranslatePipe,
    HeaderComponent,
    IonHeader,
    IonMenuButton,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonDatetime,
    IonDatetimeButton,
    IonPopover,
  ],
})
export class StatisticPage implements OnInit {
  uiStatistic = inject(UIStatistic);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiMillStorage = inject(UIMillStorage);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private translate = inject(TranslateService);
  private readonly currencyService = inject(CurrencyService);

  @ViewChild('brewChart', { static: false }) public brewChart;
  @ViewChild('brewsPerDayChart', { static: false }) public brewsPerDayChart;
  @ViewChild('drinkingChart', { static: false }) public drinkingChart;
  @ViewChild('preparationUsageChart', { static: false })
  public preparationUsageChart;
  @ViewChild('grindingChart', { static: false }) public grindingChart;
  @ViewChild('preparationUsageTimelineChart', { static: false })
  public preparationUsageTimelineChart;
  @ViewChild('grinderUsageTimelineChart', { static: false })
  public grinderUsageTimelineChart;

  @ViewChild('beansByCountryChart', { static: false })
  public beansByCountryChart;
  @ViewChild('beansByProcessingChart', { static: false })
  public beansByProcessingChart;
  @ViewChild('beansByRoasterChart', { static: false })
  public beansByRoasterChart;
  @ViewChild('beansAvgRatingByCountryChart', { static: false })
  public beansAvgRatingByCountryChart;

  public currencies = currencyToSymbolMap;
  public segment: string = 'GENERAL';

  public rangeMode: STATISTIC_RANGE_MODE = 'ALL';
  public dateRange: IStatisticDateRange = getDefaultStatisticDateRange();
  public customStart: string = moment().startOf('month').format();
  public customEnd: string = moment().endOf('day').format();
  // Previous picker values, used to tell a day tap (same year+month) apart
  // from month/year navigation (which also fires ionChange).
  private lastCustomStart: string = this.customStart;
  private lastCustomEnd: string = this.customEnd;

  // Keep references so charts can be destroyed before re-render (Chart.js
  // throws "Canvas is already in use" otherwise).
  private chartRegistry: Record<string, Chart> = {};

  public getCurrencySymbol() {
    return this.currencyService.getActualCurrencySymbol();
  }

  public ionViewDidEnter(): void {}

  public ionViewWillEnter(): void {
    this.rangeMode = 'ALL';
    this.dateRange = getDefaultStatisticDateRange();
    this.uiStatistic.setDateRange(this.dateRange);
  }

  public onRangeModeChange(mode: STATISTIC_RANGE_MODE): void {
    this.rangeMode = mode;
    if (mode !== 'CUSTOM') {
      this.dateRange = resolveQuickRange(
        mode,
        this.uiHelper.getUnixTimestamp(),
      );
      this.__applyDateRange();
    }
  }

  private __applyCustomRange(): void {
    if (this.customStart && this.customEnd) {
      this.dateRange = {
        mode: 'CUSTOM',
        start: moment(this.customStart).startOf('day').unix(),
        end: moment(this.customEnd).endOf('day').unix(),
      };
      this.__applyDateRange();
    }
  }

  public onCustomStartChanged(popover: IonPopover): void {
    const isDaySelection = this.__isSameYearMonth(
      this.customStart,
      this.lastCustomStart,
    );
    this.lastCustomStart = this.customStart;
    // Month/year navigation also fires ionChange; only commit + close the
    // popover when the user actually taps a day within the shown month.
    if (isDaySelection) {
      this.__applyCustomRange();
      popover.dismiss();
    }
  }

  public onCustomEndChanged(popover: IonPopover): void {
    const isDaySelection = this.__isSameYearMonth(
      this.customEnd,
      this.lastCustomEnd,
    );
    this.lastCustomEnd = this.customEnd;
    if (isDaySelection) {
      this.__applyCustomRange();
      popover.dismiss();
    }
  }

  private __isSameYearMonth(a: string, b: string): boolean {
    if (!a || !b) {
      return false;
    }
    const aM = moment(a);
    const bM = moment(b);
    return aM.year() === bM.year() && aM.month() === bM.month();
  }

  private __applyDateRange(): void {
    this.uiStatistic.setDateRange(this.dateRange);
    this.__reloadActiveSegmentCharts();
  }

  private __reloadActiveSegmentCharts(): void {
    switch (this.segment) {
      case 'BREWS':
        this.loadBrewCharts();
        break;
      case 'BEANS':
        this.loadBeanCharts();
        break;
      case 'PREPARATIONS':
        this.loadPreparationCharts();
        break;
      case 'GRINDERS':
        this.loadGrinderCharts();
        break;
      default:
        // GENERAL has no charts; scalar cards refresh via change detection.
        break;
    }
  }

  private __renderChart(key: string, nativeElement: any, config: any): void {
    if (this.chartRegistry[key]) {
      this.chartRegistry[key].destroy();
    }
    this.chartRegistry[key] = new Chart(nativeElement, config);
  }

  private __getBeansInRange(): Array<Bean> {
    const field =
      this.uiSettingsStorage.getSettings().statistic_bean_date_field;
    return filterBeansByRange(
      this.uiBeanStorage.getAllEntries(),
      this.dateRange,
      field,
    );
  }

  public loadBrewCharts() {
    setTimeout(() => {
      this.__loadDrinkingChart();
      this.__loadBrewChart();
      this.__loadBrewPerDayChart();
    }, 250);
  }

  public loadBeanCharts() {
    setTimeout(() => {
      this.__loadBeansByCountryChart();
      this.__loadBeansByProcessingChart();
      this.__loadBeansByRoasterChart();
      this.__loadAvgBeanRatingByCountryChart();
    }, 250);
  }

  private __loadAvgBeanRatingByCountryChart(): void {
    const brews = filterByConfigTimestamp(
      this.uiBrewStorage.getAllEntries(),
      this.dateRange,
    );
    const beans = this.__getBeansFromBrews(brews);
    const countries = Array.from(
      new Set(
        beans
          .map((b) => b.bean_information.map((info) => info.country))
          .reduce((acc, val) => acc.concat(val), [])
          .filter((c) => c),
      ),
    );
    const data = {
      labels: [],
      datasets: [
        {
          label: this.translate.instant('PAGE_STATISTICS_AVG_RATING'),
          data: [],
          borderColor: 'rgb(159,140,111)',
          backgroundColor: 'rgb(205,194,172)',
        },
      ],
    };
    for (const country of countries) {
      const beansForCountry = beans.filter((b) =>
        b.bean_information.some((info) => info.country === country),
      );
      const brewsForCountry = brews.filter((b) =>
        beansForCountry.some((bean) => bean.config.uuid === b.bean),
      );
      const totalRating = brewsForCountry.reduce(
        (acc, brew) => acc + brew.rating,
        0,
      );
      const avgRating =
        brewsForCountry.length > 0 ? totalRating / brewsForCountry.length : 0;
      if (!country) continue;
      data.labels.push(country);
      data.datasets[0].data.push(avgRating);
    }

    this.__renderChart(
      'beansAvgRatingByCountryChart',
      this.beansAvgRatingByCountryChart.nativeElement,
      {
        type: 'radar',
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
          },
        },
      } as any,
    );
  }

  private __loadBeansByRoasterChart(): void {
    const beans = this.__getBeansInRange();
    const roasters = Array.from(
      new Set(beans.map((b) => b.roaster).filter((r) => r)),
    );

    const data = {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [],
          borderColor: '#fff',
        },
      ],
    };

    for (const roaster of roasters) {
      if (!roaster) continue;
      data.labels.push(roaster);
      data.datasets[0].data.push(
        beans.filter((b) => b.roaster === roaster).length,
      );
    }

    const colorGradient = new Gradient()
      .setColorGradient('#CDC2AC', '#607D8B', '#BF658F', '#E0A29A')
      .setMidpoint(Math.max(4, data.labels.length))
      .getColors();
    data.datasets[0].backgroundColor = colorGradient;

    this.__renderChart(
      'beansByRoasterChart',
      this.beansByRoasterChart.nativeElement,
      {
        type: 'pie',
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
          },
        },
      } as any,
    );
  }

  private __loadBeansByProcessingChart(): void {
    const beans = this.__getBeansInRange();
    const processings = Array.from(
      new Set(
        beans
          .map((b) => b.bean_information.map((info) => info.processing))
          .reduce((acc, val) => acc.concat(val), [])
          .filter((p) => p),
      ),
    );

    const data = {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [],
          borderColor: '#fff',
        },
      ],
    };

    for (const processing of processings) {
      if (!processing) continue;
      data.labels.push(processing);
      data.datasets[0].data.push(
        beans.filter((b) =>
          b.bean_information.some((info) => info.processing === processing),
        ).length,
      );
    }

    const colorGradient = new Gradient()
      .setColorGradient('#CDC2AC', '#607D8B', '#BF658F', '#E0A29A')
      .setMidpoint(Math.max(4, data.labels.length))
      .getColors();
    data.datasets[0].backgroundColor = colorGradient;

    this.__renderChart(
      'beansByProcessingChart',
      this.beansByProcessingChart.nativeElement,
      {
        type: 'pie',
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
          },
        },
      } as any,
    );
  }

  private __loadBeansByCountryChart(): void {
    const beans = this.__getBeansInRange();
    const countries = Array.from(
      new Set(
        beans
          .map((b) => b.bean_information.map((info) => info.country))
          .reduce((acc, val) => acc.concat(val), [])
          .filter((c) => c),
      ),
    );

    const data = {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [],
          borderColor: '#fff',
        },
      ],
    };

    for (const country of countries) {
      if (!country) continue;
      data.labels.push(country);
      data.datasets[0].data.push(
        beans.filter((b) =>
          b.bean_information.some((info) => info.country === country),
        ).length,
      );
    }

    const colorGradient = new Gradient()
      .setColorGradient('#CDC2AC', '#607D8B', '#BF658F', '#E0A29A')
      .setMidpoint(Math.max(4, data.labels.length))
      .getColors();
    data.datasets[0].backgroundColor = colorGradient;

    this.__renderChart(
      'beansByCountryChart',
      this.beansByCountryChart.nativeElement,
      {
        type: 'pie',
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
          },
        },
      } as any,
    );
  }

  private __getBeansFromBrews(brews: Brew[]): any[] {
    const brewedBeanUuids = new Set(brews.map((b) => b.bean));
    const beans = [];
    for (const uuid of brewedBeanUuids) {
      const bean = this.uiBeanStorage.getByUUID(uuid);
      if (bean) {
        beans.push(bean);
      }
    }
    return beans;
  }

  public loadPreparationCharts() {
    setTimeout(() => {
      this.__loadPreparationUsageChart();
      this.__loadPreparationUsageTimelineChart();
    }, 250);
  }

  public loadGrinderCharts() {
    setTimeout(() => {
      this.__loadGrindingChart();
      this.__loadGrinderUsageTimelineChart();
    }, 250);
  }

  public ngOnInit() {}

  private __getBrewsSortedForMonth(): Array<BrewView> {
    const brewViews: Array<BrewView> = [];
    const brews: Array<Brew> = filterByConfigTimestamp(
      this.uiBrewStorage.getAllEntries(),
      this.dateRange,
    );
    // sort latest to top.
    const brewsCopy: Array<Brew> = [...brews];

    const sortedBrews: Array<IBrew> = UIBrewHelper.sortBrewsASC(brewsCopy);

    const collection = {};
    // Create collection
    for (const brew of sortedBrews) {
      const month: string = this.uiHelper.formateDate(
        brew.config.unix_timestamp,
        'MMMM',
      );
      const year: string = this.uiHelper.formateDate(
        brew.config.unix_timestamp,
        'YYYY',
      );
      if (collection[month + ' - ' + year] === undefined) {
        collection[month + ' - ' + year] = {
          BREWS: [],
        };
      }
      collection[month + ' - ' + year].BREWS.push(brew);
    }

    for (const key in collection) {
      if (collection.hasOwnProperty(key)) {
        const viewObj: BrewView = new BrewView();
        viewObj.title = key;
        viewObj.brews = collection[key].BREWS;

        brewViews.push(viewObj);
      }
    }

    return brewViews;
  }
  private __getBrewsSortedForDay(): Array<BrewView> {
    const brewViews: Array<BrewView> = [];
    const brews: Array<Brew> = filterByConfigTimestamp(
      this.uiBrewStorage.getAllEntries(),
      this.dateRange,
    );
    // sort latest to top.
    const brewsCopy: Array<Brew> = [...brews];

    const sortedBrews: Array<IBrew> = UIBrewHelper.sortBrewsASC(brewsCopy);

    const collection = {};
    // Create collection
    for (const brew of sortedBrews) {
      const day: string = this.uiHelper.formateDate(
        brew.config.unix_timestamp,
        'DD',
      );
      const month: string = this.uiHelper.formateDate(
        brew.config.unix_timestamp,
        'MM',
      );
      const year: string = this.uiHelper.formateDate(
        brew.config.unix_timestamp,
        'YY',
      );
      if (collection[day + '.' + month + '.' + year] === undefined) {
        collection[day + '.' + month + '.' + year] = {
          BREWS: [],
        };
      }
      collection[day + '.' + month + '.' + year].BREWS.push(brew);
    }

    for (const key in collection) {
      if (collection.hasOwnProperty(key)) {
        const viewObj: BrewView = new BrewView();
        viewObj.title = key;
        viewObj.brews = collection[key].BREWS;

        brewViews.push(viewObj);
      }
    }

    return brewViews;
  }

  private __loadGrinderUsageTimelineChart(): void {
    const brewEntries: Array<Brew> = this.uiBrewStorage.getAllEntries();
    const brewView: Array<BrewView> = this.__getBrewsSortedForMonth();
    // Take the last 12 Months when showing all-time data; otherwise show
    // every bucket within the selected range.
    const lastBrewViews: Array<BrewView> =
      this.dateRange.mode === 'ALL' ? brewView.slice(-12) : brewView;

    const grinderIds: Array<string> = Array.from(
      new Set(brewEntries.map((e: Brew) => e.mill)),
    );

    const data = {
      labels: [],
      datasets: [],
    };

    const datasets = [];

    for (const forBrew of lastBrewViews) {
      data.labels.push(forBrew.title);
      for (const id of grinderIds) {
        const foundDataset = datasets.filter((e) => e.UUID === id);
        if (foundDataset[0]) {
          foundDataset[0].DATA.push(
            forBrew.brews.filter((e: Brew) => e.mill === id).length,
          );
        } else {
          const newDataObj: any = {
            UUID: id,
            DATA: [forBrew.brews.filter((e: Brew) => e.mill === id).length],
            LABEL: this.uiMillStorage.getMillNameByUUID(id),
          };

          datasets.push(newDataObj);
        }
      }
    }

    const colorGradient = new Gradient()
      .setColorGradient('#CDC2AC', '#607D8B', '#BF658F', '#E0A29A')
      .setMidpoint(Math.max(4, datasets.length))
      .getColors();

    const colorArray = colorGradient;
    for (let i = 0; i < datasets.length; i++) {
      const prepObj: any = {
        label: datasets[i].LABEL,
        data: datasets[i].DATA,
        borderColor: colorArray[i],
        backgroundColor: 'transparent',
      };
      data.datasets.push(prepObj);
    }

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: '',
        },
      },
    };

    this.__renderChart(
      'grinderUsageTimelineChart',
      this.grinderUsageTimelineChart.nativeElement,
      {
        type: 'line',
        data: data,
        options: chartOptions,
      } as any,
    );
  }
  private __loadPreparationUsageTimelineChart(): void {
    const brewEntries: Array<Brew> = this.uiBrewStorage.getAllEntries();
    const brewView: Array<BrewView> = this.__getBrewsSortedForMonth();
    // Take the last 12 Months when showing all-time data; otherwise show
    // every bucket within the selected range.
    const lastBrewViews: Array<BrewView> =
      this.dateRange.mode === 'ALL' ? brewView.slice(-12) : brewView;

    const preparationMethodIds: Array<string> = Array.from(
      new Set(brewEntries.map((e: Brew) => e.method_of_preparation)),
    );

    const data = {
      labels: [],
      datasets: [],
    };

    const datasets = [];

    for (const forBrew of lastBrewViews) {
      data.labels.push(forBrew.title);
      for (const id of preparationMethodIds) {
        const foundDataset = datasets.filter((e) => e.UUID === id);
        if (foundDataset[0]) {
          foundDataset[0].DATA.push(
            forBrew.brews.filter((e: Brew) => e.method_of_preparation === id)
              .length,
          );
        } else {
          const newDataObj: any = {
            UUID: id,
            DATA: [
              forBrew.brews.filter((e: Brew) => e.method_of_preparation === id)
                .length,
            ],
            LABEL: this.uiPreparationStorage.getPreparationNameByUUID(id),
          };

          datasets.push(newDataObj);
        }
      }
    }

    const colorGradient = new Gradient()
      .setColorGradient('#CDC2AC', '#607D8B', '#BF658F', '#E0A29A')
      .setMidpoint(Math.max(4, datasets.length))
      .getColors();
    const colorArray = colorGradient;
    for (let i = 0; i < datasets.length; i++) {
      const prepObj: any = {
        label: datasets[i].LABEL,
        data: datasets[i].DATA,
        borderColor: colorArray[i],
        backgroundColor: 'transparent',
      };
      data.datasets.push(prepObj);
    }

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: '',
        },
      },
    };

    this.__renderChart(
      'preparationUsageTimelineChart',
      this.preparationUsageTimelineChart.nativeElement,
      {
        type: 'line',
        data: data,
        options: chartOptions,
      } as any,
    );
  }
  private __loadDrinkingChart(): void {
    const brewView: Array<BrewView> = this.__getBrewsSortedForMonth();
    // Take the last 12 Months when showing all-time data; otherwise show
    // every bucket within the selected range.
    const lastBrewViews: Array<BrewView> =
      this.dateRange.mode === 'ALL' ? brewView.slice(-12) : brewView;

    const drinkingData = {
      labels: [],
      datasets: [
        {
          label:
            this.translate.instant('PAGE_STATISTICS_DRUNKEN_QUANTITY') +
            ' (kg/l)',
          data: [],
          borderColor: 'rgb(159,140,111)',
          backgroundColor: 'rgb(205,194,172)',
        },
      ],
    };

    for (const forBrew of lastBrewViews) {
      drinkingData.labels.push(forBrew.title);
    }
    for (const forBrew of lastBrewViews) {
      let drunkenQuantity: number = 0;
      for (const brew of forBrew.brews) {
        if (brew.brew_beverage_quantity > 0) {
          drunkenQuantity += brew.brew_beverage_quantity;
        } else {
          drunkenQuantity += brew.brew_quantity;
        }
      }
      drinkingData.datasets[0].data.push(
        Math.round((drunkenQuantity / 1000) * 100) / 100,
      );
    }
    const chartOptions = {
      legend: {
        display: false,
        position: 'top',
      },
    };

    this.__renderChart('drinkingChart', this.drinkingChart.nativeElement, {
      type: 'line',
      data: drinkingData,
      options: chartOptions,
    } as any);
  }
  private __loadBrewPerDayChart(): void {
    const brewView: Array<BrewView> = this.__getBrewsSortedForDay();
    // Take the last 30 days when showing all-time data; otherwise show
    // every bucket within the selected range.
    const lastBrewViews: Array<BrewView> =
      this.dateRange.mode === 'ALL' ? brewView.slice(-30) : brewView;

    const drinkingData = {
      labels: [],
      datasets: [
        {
          label: this.translate.instant('PAGE_STATISTICS_BREW_PROCESSES'),
          data: [],
          borderColor: 'rgb(159,140,111)',
          backgroundColor: 'rgb(205,194,172)',
        },
      ],
    };

    for (const forBrew of lastBrewViews) {
      drinkingData.labels.push(forBrew.title);
    }
    for (const forBrew of lastBrewViews) {
      drinkingData.datasets[0].data.push(forBrew.brews.length);
    }
    const chartOptions = {
      legend: {
        display: false,
        position: 'top',
      },
    };

    this.__renderChart(
      'brewsPerDayChart',
      this.brewsPerDayChart.nativeElement,
      {
        type: 'line',
        data: drinkingData,
        options: chartOptions,
      } as any,
    );
  }
  private __loadBrewChart(): void {
    const brewView: Array<BrewView> = this.__getBrewsSortedForMonth();
    // Take the last 12 Months when showing all-time data; otherwise show
    // every bucket within the selected range.
    const lastBrewViews: Array<BrewView> =
      this.dateRange.mode === 'ALL' ? brewView.slice(-12) : brewView;

    const drinkingData = {
      labels: [],
      datasets: [
        {
          label: this.translate.instant('PAGE_STATISTICS_BREW_PROCESSES'),
          data: [],
          borderColor: 'rgb(159,140,111)',
          backgroundColor: 'rgb(205,194,172)',
        },
      ],
    };

    for (const forBrew of lastBrewViews) {
      drinkingData.labels.push(forBrew.title);
    }
    for (const forBrew of lastBrewViews) {
      drinkingData.datasets[0].data.push(forBrew.brews.length);
    }
    const chartOptions = {
      legend: {
        display: false,
        position: 'top',
      },
    };

    this.__renderChart('brewChart', this.brewChart.nativeElement, {
      type: 'line',
      data: drinkingData,
      options: chartOptions,
    } as any);
  }

  private __loadGrindingChart(): void {
    const brewView: Array<BrewView> = this.__getBrewsSortedForMonth();
    // Take the last 12 Months when showing all-time data; otherwise show
    // every bucket within the selected range.
    const lastBrewViews: Array<BrewView> =
      this.dateRange.mode === 'ALL' ? brewView.slice(-12) : brewView;

    const drinkingData = {
      labels: [],
      datasets: [
        {
          label: this.translate.instant('PAGE_STATISTICS_BEAN_WEIGHT_USED'),
          data: [],
          borderColor: 'rgb(159,140,111)',
          backgroundColor: 'rgb(205,194,172)',
        },
      ],
    };

    for (const forBrew of lastBrewViews) {
      drinkingData.labels.push(forBrew.title);
    }
    for (const forBrew of lastBrewViews) {
      let weightCount: number = 0;
      for (const brew of forBrew.brews) {
        weightCount += brew.grind_weight;
      }
      drinkingData.datasets[0].data.push(weightCount);
    }
    const chartOptions = {
      legend: {
        display: false,
        position: 'top',
      },
    };

    this.__renderChart('grindingChart', this.grindingChart.nativeElement, {
      type: 'line',
      data: drinkingData,
      options: chartOptions,
    } as any);
  }
  private __loadPreparationUsageChart(): void {
    const brewView: Array<Brew> = filterByConfigTimestamp(
      this.uiBrewStorage.getAllEntries(),
      this.dateRange,
    );
    const preparationMethodIds: Array<string> = Array.from(
      new Set(brewView.map((e: Brew) => e.method_of_preparation)),
    );

    const data = [
      {
        data: [],
        labels: [],
        backgroundColor: [],
        borderColor: '#fff',
      },
    ];
    const labels: Array<string> = [];
    for (const id of preparationMethodIds) {
      data[0].data.push(
        brewView.filter((e: Brew) => e.method_of_preparation === id).length,
      );
      data[0].labels.push(
        this.uiPreparationStorage.getPreparationNameByUUID(id),
      );
      labels.push(this.uiPreparationStorage.getPreparationNameByUUID(id));
    }

    const colorGradient = new Gradient()
      .setColorGradient('#CDC2AC', '#607D8B', '#BF658F', '#E0A29A')
      .setMidpoint(Math.max(4, data[0].labels.length))
      .getColors();

    data[0].backgroundColor = colorGradient;

    const drinkingData = {
      labels: labels,
      datasets: data,
      titel: '',
    };

    const chartOptions = {
      legend: {
        display: true,
        position: 'top',
      },
      plugins: {
        labels: {
          render: 'value',
        },
      },
      tooltips: {
        callbacks: {
          label: (tooltipItem, mapData) => {
            try {
              let label = ' ' + mapData.labels[tooltipItem.index] || '';

              if (label) {
                label += ': ';
              }

              const sum = mapData.datasets[0].data.reduce(
                (accumulator, curValue) => {
                  return accumulator + curValue;
                },
              );
              const value =
                mapData.datasets[tooltipItem.datasetIndex].data[
                  tooltipItem.index
                ];

              label += Number((value / sum) * 100).toFixed(2) + '%';
              return label;
            } catch (error) {}
          },
        },
      },
    };

    this.__renderChart(
      'preparationUsageChart',
      this.preparationUsageChart.nativeElement,
      {
        type: 'pie',
        data: drinkingData,
        options: chartOptions,
      } as any,
    );
  }
}

export default StatisticPage;
