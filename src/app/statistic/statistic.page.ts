import { Component, OnInit, ViewChild } from '@angular/core';
import { BrewView } from '../../classes/brew/brewView';
import { UIStatistic } from '../../services/uiStatistic';
import { UIHelper } from '../../services/uiHelper';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { Brew } from '../../classes/brew/brew';
import { IBrew } from '../../interfaces/brew/iBrew';
import { Chart } from 'chart.js';
import { TranslateService } from '@ngx-translate/core';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import Gradient from 'javascript-color-gradient';
import { UIMillStorage } from '../../services/uiMillStorage';
import currencyToSymbolMap from 'currency-symbol-map/map';
import { CurrencyService } from '../../services/currencyService/currency.service';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { Bean } from '../../classes/bean/bean';
import { countBy } from 'lodash';

@Component({
  selector: 'statistic',
  templateUrl: './statistic.page.html',
  styleUrls: ['./statistic.page.scss'],
})
export class StatisticPage implements OnInit {
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
  @ViewChild('avgRatingByCountryChart', { static: false })
  public avgRatingByCountryChart;

  public currencies = currencyToSymbolMap;
  public segment: string = 'GENERAL';
  constructor(
    public uiStatistic: UIStatistic,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiHelper: UIHelper,
    private readonly uiMillStorage: UIMillStorage,
    private translate: TranslateService,
    private readonly currencyService: CurrencyService,
  ) {}

  public getCurrencySymbol() {
    return this.currencyService.getActualCurrencySymbol();
  }

  public ionViewDidEnter(): void {}

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
      this.__loadBeansByProcessing();
      this.__loadBeansByRoaster();
      this.__loadAvgRatingByOriginChart();
    }, 250);
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

  private __whiteColor = '#fff';
  private __coffeeColor = 'rgb(159,140,111)';
  private __coffeeBgColor = 'rgb(205,194,172)';
  private __baseGradientColors = ['#CDC2AC', '#607D8B', '#BF658F', '#E0A29A'];

  private __getGradientArray(length: number): string[] {
    const gradient = new Gradient();

    gradient.setGradient(...this.__baseGradientColors);
    gradient.setMidpoint(length);

    return gradient.getArray() as string[];
  }

  private __getBrewsSortedForMonth(): Array<BrewView> {
    const brewViews: Array<BrewView> = [];
    const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
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
    const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
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
    // Take the last 12 Months
    const lastBrewViews: Array<BrewView> = brewView.slice(-12);

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

    const colorArray = this.__getGradientArray(datasets.length);
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

    const grindingChartToDismiss = new Chart(
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
    // Take the last 12 Months
    const lastBrewViews: Array<BrewView> = brewView.slice(-12);

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

    const colorArray = this.__getGradientArray(datasets.length);
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

    const grindingChartToDismiss = new Chart(
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
    // Take the last 12 Months
    const lastBrewViews: Array<BrewView> = brewView.slice(-12);

    const drinkingData = {
      labels: [],
      datasets: [
        {
          label:
            this.translate.instant('PAGE_STATISTICS_DRUNKEN_QUANTITY') +
            ' (kg/l)',
          data: [],
          borderColor: this.__coffeeColor,
          backgroundColor: this.__coffeeBgColor,
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

    const drinkChartToDismiss = new Chart(this.drinkingChart.nativeElement, {
      type: 'line',
      data: drinkingData,
      options: chartOptions,
    } as any);
  }
  private __loadBrewPerDayChart(): void {
    const brewView: Array<BrewView> = this.__getBrewsSortedForDay();
    // Take the last 12 Months
    const lastBrewViews: Array<BrewView> = brewView.slice(-30);

    const drinkingData = {
      labels: [],
      datasets: [
        {
          label: this.translate.instant('PAGE_STATISTICS_BREW_PROCESSES'),
          data: [],
          borderColor: this.__coffeeColor,
          backgroundColor: this.__coffeeBgColor,
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

    const brewChartToDismiss = new Chart(this.brewsPerDayChart.nativeElement, {
      type: 'line',
      data: drinkingData,
      options: chartOptions,
    } as any);
  }
  private __loadBrewChart(): void {
    const brewView: Array<BrewView> = this.__getBrewsSortedForMonth();
    // Take the last 12 Months
    const lastBrewViews: Array<BrewView> = brewView.slice(-12);

    const drinkingData = {
      labels: [],
      datasets: [
        {
          label: this.translate.instant('PAGE_STATISTICS_BREW_PROCESSES'),
          data: [],
          borderColor: this.__coffeeColor,
          backgroundColor: this.__coffeeBgColor,
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

    const brewChartToDismiss = new Chart(this.brewChart.nativeElement, {
      type: 'line',
      data: drinkingData,
      options: chartOptions,
    } as any);
  }

  private __loadGrindingChart(): void {
    const brewView: Array<BrewView> = this.__getBrewsSortedForMonth();
    // Take the last 12 Months
    const lastBrewViews: Array<BrewView> = brewView.slice(-12);

    const drinkingData = {
      labels: [],
      datasets: [
        {
          label: this.translate.instant('PAGE_STATISTICS_BEAN_WEIGHT_USED'),
          data: [],
          borderColor: this.__coffeeColor,
          backgroundColor: this.__coffeeBgColor,
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

    const grindingChartToDismiss = new Chart(this.grindingChart.nativeElement, {
      type: 'line',
      data: drinkingData,
      options: chartOptions,
    } as any);
  }

  private __getBeansFromBrews(brews: Brew[]): Bean[] {
    return brews.map((brew) => this.uiBeanStorage.getByUUID(brew.bean) as Bean);
  }

  private __loadBeansByCountryChart(): void {
    const brewView = this.uiBrewStorage.getAllEntries();
    const usedBeans = this.__getBeansFromBrews(brewView);
    const allCountriesByBrews: string[] = usedBeans.map(
      (bean) =>
        bean.bean_information
          .map((beanInfo) => beanInfo.country)
          .sort((a, b) => a.localeCompare(b))
          .join(' + ')
          .replace(/^$/, 'No country'), // TODO: Use translatable const
    );
    const countedCountries: Record<string, number> =
      countBy(allCountriesByBrews);

    const data = {
      datasets: [
        {
          data: Object.values(countedCountries),
          backgroundColor: this.__getGradientArray(
            Object.values(countedCountries).length,
          ),
          borderColor: this.__whiteColor,
        },
      ],
      labels: Object.keys(countedCountries),
    };

    const options = {
      legend: {
        display: true,
        position: 'top',
      },
    };

    new Chart(this.beansByCountryChart.nativeElement, {
      type: 'pie',
      data,
      options,
    } as any);
  }

  private __loadBeansByProcessing(): void {
    const brewView = this.uiBrewStorage.getAllEntries();
    const usedBeans = this.__getBeansFromBrews(brewView);
    const allProcessing: string[] = usedBeans.map(
      (bean) =>
        bean.bean_information
          .map((beanInfo) => beanInfo.processing)
          .sort((a, b) => a.localeCompare(b))
          .join(' + ')
          .replace(/^$/, 'No processing method'), // TODO: Use translatable const
    );
    const countedProcessing: Record<string, number> = countBy(allProcessing);

    const data = {
      datasets: [
        {
          data: Object.values(countedProcessing),
          backgroundColor: this.__getGradientArray(
            Object.values(countedProcessing).length,
          ),
          borderColor: this.__whiteColor,
        },
      ],
      labels: Object.keys(countedProcessing),
    };

    const options = {
      legend: {
        display: true,
        position: 'top',
      },
    };

    new Chart(this.beansByProcessingChart.nativeElement, {
      type: 'pie',
      data,
      options,
    } as any);
  }

  private __loadBeansByRoaster(): void {
    const brewView = this.uiBrewStorage.getAllEntries();
    const usedBeans = this.__getBeansFromBrews(brewView);
    const allRoasters: string[] = usedBeans.map((bean) =>
      bean.roaster.replace(/^$/, 'No roaster method'),
    ); // TODO: Use translatable const
    const countedRoasters: Record<string, number> = countBy(allRoasters);

    const data = {
      datasets: [
        {
          data: Object.values(countedRoasters),
          backgroundColor: this.__getGradientArray(
            Object.values(countedRoasters).length,
          ),
          borderColor: this.__whiteColor,
        },
      ],
      labels: Object.keys(countedRoasters),
    };

    const options = {
      legend: {
        display: true,
        position: 'top',
      },
    };

    new Chart(this.beansByRoasterChart.nativeElement, {
      type: 'pie',
      data,
      options,
    } as any);
  }

  private __loadAvgRatingByOriginChart(): void {
    const brewView = this.uiBrewStorage.getAllEntries();
    const usedBeans = this.__getBeansFromBrews(brewView);
    const sumOfRatings: Record<
      string,
      {
        rating: number;
        ratingCount: number;
        favouriteRating: number;
        favouriteRatingCount: number;
        bestRating: number;
        bestRatingCount: number;
      }
    > = {};

    for (let i = 0; i < brewView.length; i++) {
      const currentCountry = usedBeans[i].bean_information
        .map((beanInfo) => beanInfo.country)
        .sort((a, b) => a.localeCompare(b))
        .join(' + ')
        .replace(/^$/, 'No country');

      if (!(currentCountry in sumOfRatings)) {
        sumOfRatings[currentCountry] = {
          rating: 0,
          ratingCount: 0,
          favouriteRating: 0,
          favouriteRatingCount: 0,
          bestRating: 0,
          bestRatingCount: 0,
        };
      }

      sumOfRatings[currentCountry].rating += brewView[i].rating;
      sumOfRatings[currentCountry].ratingCount++;

      if (brewView[i].favourite) {
        sumOfRatings[currentCountry].favouriteRating += brewView[i].rating;
        sumOfRatings[currentCountry].favouriteRatingCount++;
      }

      if (brewView[i].best_brew) {
        sumOfRatings[currentCountry].bestRating += brewView[i].rating;
        sumOfRatings[currentCountry].bestRatingCount++;
      }
    }

    const avgRatingByCountry = {};
    const avgFavouriteRatingByCountry = {};
    const avgBestRatingByCountry = {};

    Object.entries(sumOfRatings).forEach(([country, data]) => {
      avgRatingByCountry[country] = data.ratingCount
        ? data.rating / data.ratingCount
        : null;
      avgFavouriteRatingByCountry[country] = data.favouriteRatingCount
        ? data.favouriteRating / data.favouriteRatingCount
        : null;
      avgBestRatingByCountry[country] = data.bestRatingCount
        ? data.bestRatingCount / data.bestRatingCount
        : null;
    });

    const gradient = this.__getGradientArray(3);

    const data = {
      datasets: [
        {
          data: Object.values(avgRatingByCountry),
          backgroundColor: gradient[0] + '40',
          borderColor: gradient[0],
          pointBackgroundColor: gradient[0],
          label: 'avg rating',
        },
        {
          data: Object.values(avgFavouriteRatingByCountry),
          backgroundColor: gradient[1] + '40',
          borderColor: gradient[1],
          pointBackgroundColor: gradient[1],
          label: 'avg fav rating',
        },
        {
          data: Object.values(avgBestRatingByCountry),
          backgroundColor: gradient[2] + '40',
          borderColor: gradient[2],
          pointBackgroundColor: gradient[2],
          label: 'avg best rating',
        },
      ],
      labels: Object.keys(sumOfRatings),
    };

    const options = {
      legend: {
        display: true,
        position: 'top',
      },
    };

    new Chart(this.avgRatingByCountryChart.nativeElement, {
      type: 'radar',
      data,
      options,
    } as any);
  }

  private __loadPreparationUsageChart(): void {
    const brewView: Array<Brew> = this.uiBrewStorage.getAllEntries();
    const preparationMethodIds: Array<string> = Array.from(
      new Set(brewView.map((e: Brew) => e.method_of_preparation)),
    );

    const data = [
      {
        data: [],
        labels: [],
        backgroundColor: [],
        borderColor: this.__whiteColor,
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

    data[0].backgroundColor = this.__getGradientArray(data[0].labels.length);

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

    const preparationChartToDismiss = new Chart(
      this.preparationUsageChart.nativeElement,
      {
        type: 'pie',
        data: drinkingData,
        options: chartOptions,
      } as any,
    );
  }
}
