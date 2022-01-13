import {Component, OnInit, ViewChild} from '@angular/core';
import {BrewView} from '../../classes/brew/brewView';
import {UIStatistic} from '../../services/uiStatistic';
import {UIHelper} from '../../services/uiHelper';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {Brew} from '../../classes/brew/brew';
import {IBrew} from '../../interfaces/brew/iBrew';
import {Chart} from 'chart.js';
import {TranslateService} from '@ngx-translate/core';
import {UIBrewHelper} from '../../services/uiBrewHelper';
import {UIPreparationStorage} from '../../services/uiPreparationStorage';
import Gradient from 'javascript-color-gradient';
import {UIMillStorage} from '../../services/uiMillStorage';
import currencyToSymbolMap from 'currency-symbol-map/map';
import {CurrencyService} from '../../services/currencyService/currency.service';
@Component({
  selector: 'statistic',
  templateUrl: './statistic.page.html',
  styleUrls: ['./statistic.page.scss'],
})
export class StatisticPage implements OnInit {

  @ViewChild('brewChart', {static: false}) public brewChart;
  @ViewChild('brewsPerDayChart', {static: false}) public brewsPerDayChart;

  @ViewChild('drinkingChart', {static: false}) public drinkingChart;
  @ViewChild('preparationUsageChart', {static: false}) public preparationUsageChart;
  @ViewChild('grindingChart', {static: false}) public grindingChart;
  @ViewChild('preparationUsageTimelineChart', {static: false}) public preparationUsageTimelineChart;
  @ViewChild('grinderUsageTimelineChart', {static: false}) public grinderUsageTimelineChart;

  public currencies = currencyToSymbolMap;
  public segment: string = 'GENERAL';
  constructor(
    public uiStatistic: UIStatistic,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiHelper: UIHelper,
    private readonly uiMillStorage: UIMillStorage,
    private translate: TranslateService,
    private readonly currencyService: CurrencyService
  ) {


  }

  public getCurrencySymbol() {
    return this.currencyService.getActualCurrencySymbol();
  }

  public ionViewDidEnter(): void {

  }

  public loadBrewCharts() {
    setTimeout(() => {
      this.__loadDrinkingChart();
      this.__loadBrewChart();
      this.__loadBrewPerDayChart();
      },250);

  }

  public loadBeanCharts() {

  }

  public loadPreparationCharts() {
    setTimeout(() => {
      this.__loadPreparationUsageChart();
      this.__loadPreparationUsageTimelineChart();
    },250);

  }

  public loadGrinderCharts() {
    setTimeout(() => {
      this.__loadGrindingChart();
      this.__loadGrinderUsageTimelineChart();
    },250);

  }

  public ngOnInit() {
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
      const month: string = this.uiHelper.formateDate(brew.config.unix_timestamp, 'MMMM');
      const year: string = this.uiHelper.formateDate(brew.config.unix_timestamp, 'YYYY');
      if (collection[month + ' - ' + year] === undefined) {
        collection[month + ' - ' + year] = {
          BREWS: []
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
      const day: string = this.uiHelper.formateDate(brew.config.unix_timestamp, 'DD');
      const month: string = this.uiHelper.formateDate(brew.config.unix_timestamp, 'MM');
      const year: string = this.uiHelper.formateDate(brew.config.unix_timestamp, 'YY');
      if (collection[day +'.' + month + '.' + year] === undefined) {
        collection[day +'.' + month + '.' + year] = {
          BREWS: []
        };
      }
      collection[day +'.' + month + '.' + year].BREWS.push(brew);
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

    const grinderIds: Array<string> = Array.from(new Set(brewEntries.map((e:Brew) => e.mill)));

    const data = {
      labels: [],
      datasets: [
      ]
    };

    const datasets = [];

    for (const forBrew of lastBrewViews) {
      data.labels.push(forBrew.title);
      for (const id of grinderIds) {
        const foundDataset = datasets.filter((e)=>e.UUID === id);
        if (foundDataset[0]) {
          foundDataset[0].DATA.push(forBrew.brews.filter((e: Brew)=>e.mill === id).length);
        } else {
          const newDataObj: any = {
            UUID: id,
            DATA: [forBrew.brews.filter((e: Brew)=>e.mill === id).length],
            LABEL: this.uiMillStorage.getMillNameByUUID(id),
          };

          datasets.push(newDataObj);
        }

      }

    }

    const colorGradient = new Gradient();
    const color1 = '#CDC2AC';
    const color2 = '#607D8B';
    const color3 = '#BF658F';
    const color4 = '#E0A29A';

    colorGradient.setMidpoint(datasets.length);
    colorGradient.setGradient(color1, color2, color3, color4);

    const colorArray = colorGradient.getArray();
    for (let i=0;i<datasets.length;i++) {
      const prepObj:any = {
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
          text: ''
        }
      }
    };

    const grindingChartToDismiss = new Chart(this.grinderUsageTimelineChart.nativeElement, {
      type: 'line',
      data: data,
      options: chartOptions
    } as any);

  }
  private __loadPreparationUsageTimelineChart(): void {
    const brewEntries: Array<Brew> = this.uiBrewStorage.getAllEntries();
    const brewView: Array<BrewView> = this.__getBrewsSortedForMonth();
    // Take the last 12 Months
    const lastBrewViews: Array<BrewView> = brewView.slice(-12);

    const preparationMethodIds: Array<string> = Array.from(new Set(brewEntries.map((e: Brew) => e.method_of_preparation)));

    const data = {
      labels: [],
      datasets: [
      ]
    };

    const datasets = [];

    for (const forBrew of lastBrewViews) {
      data.labels.push(forBrew.title);
      for (const id of preparationMethodIds) {
        const foundDataset = datasets.filter((e)=>e.UUID === id);
        if (foundDataset[0]) {
          foundDataset[0].DATA.push(forBrew.brews.filter((e: Brew)=>e.method_of_preparation === id).length);
        } else {
          const newDataObj: any = {
            UUID: id,
            DATA: [forBrew.brews.filter((e: Brew)=>e.method_of_preparation === id).length],
            LABEL: this.uiPreparationStorage.getPreparationNameByUUID(id),
          };

          datasets.push(newDataObj);
        }

      }

    }

    const colorGradient = new Gradient();
    const color1 = '#CDC2AC';
    const color2 = '#607D8B';
    const color3 = '#BF658F';
    const color4 = '#E0A29A';

    colorGradient.setMidpoint(datasets.length);
    colorGradient.setGradient(color1, color2, color3, color4);

    const colorArray = colorGradient.getArray();
    for (let i=0;i<datasets.length;i++) {
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
          text: ''
        }
      }
    };

    const grindingChartToDismiss = new Chart(this.preparationUsageTimelineChart.nativeElement, {
      type: 'line',
      data: data,
      options: chartOptions
    } as any);

  }
  private __loadDrinkingChart(): void {
    const brewView: Array<BrewView> = this.__getBrewsSortedForMonth();
    // Take the last 12 Months
    const lastBrewViews: Array<BrewView> = brewView.slice(-12);

    const drinkingData = {
      labels: [],
      datasets: [{
        label: this.translate.instant('PAGE_STATISTICS_DRUNKEN_QUANTITY') + ' (kg/l)',
        data: [],
        borderColor: 'rgb(159,140,111)',
        backgroundColor: 'rgb(205,194,172)',
      }]
    };

    for (const forBrew of lastBrewViews) {
      drinkingData.labels.push(forBrew.title);
    }
    for (const forBrew of lastBrewViews) {
      let drunkenQuantity: number = 0;
      for (const brew of forBrew.brews) {
        if (brew.brew_beverage_quantity > 0){
          drunkenQuantity +=brew.brew_beverage_quantity;
        } else {
          drunkenQuantity +=brew.brew_quantity;
        }

      }
      drinkingData.datasets[0].data.push(Math.round((drunkenQuantity / 1000) * 100) / 100);
    }
    const chartOptions = {
      legend: {
        display: false,
        position: 'top'
      }
    };

   const drinkChartToDismiss = new Chart(this.drinkingChart.nativeElement, {
      type: 'line',
      data: drinkingData,
      options: chartOptions
    } as any);
  }
  private __loadBrewPerDayChart(): void {
    const brewView: Array<BrewView> = this.__getBrewsSortedForDay();
    // Take the last 12 Months
    const lastBrewViews: Array<BrewView> = brewView.slice(-30);

    const drinkingData = {
      labels: [],
      datasets: [{
        label: this.translate.instant('PAGE_STATISTICS_BREW_PROCESSES'),
        data: [],
        borderColor: 'rgb(159,140,111)',
        backgroundColor: 'rgb(205,194,172)',
      }]
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
        position: 'top'
      }
    };

    const brewChartToDismiss = new Chart(this.brewsPerDayChart.nativeElement, {
      type: 'line',
      data: drinkingData,
      options: chartOptions
    } as any);
  }
  private __loadBrewChart(): void {
    const brewView: Array<BrewView> = this.__getBrewsSortedForMonth();
    // Take the last 12 Months
    const lastBrewViews: Array<BrewView> = brewView.slice(-12);

    const drinkingData = {
      labels: [],
      datasets: [{
        label: this.translate.instant('PAGE_STATISTICS_BREW_PROCESSES'),
        data: [],
        borderColor: 'rgb(159,140,111)',
        backgroundColor: 'rgb(205,194,172)',
      }]
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
        position: 'top'
      }
    };

    const brewChartToDismiss = new Chart(this.brewChart.nativeElement, {
      type: 'line',
      data: drinkingData,
      options: chartOptions
    } as any);
  }

  private __loadGrindingChart(): void {
    const brewView: Array<BrewView> = this.__getBrewsSortedForMonth();
    // Take the last 12 Months
    const lastBrewViews: Array<BrewView> = brewView.slice(-12);

    const drinkingData = {
      labels: [],
      datasets: [{
        label: this.translate.instant('PAGE_STATISTICS_BEAN_WEIGHT_USED'),
        data: [],
        borderColor: 'rgb(159,140,111)',
        backgroundColor: 'rgb(205,194,172)',
      }]
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
        position: 'top'
      }
    };

    const grindingChartToDismiss = new Chart(this.grindingChart.nativeElement, {
      type: 'line',
      data: drinkingData,
      options: chartOptions
    } as any);
  }
  private __loadPreparationUsageChart(): void {
    const brewView: Array<Brew> = this.uiBrewStorage.getAllEntries();
    const preparationMethodIds: Array<string> = Array.from(new Set(brewView.map((e: Brew) => e.method_of_preparation)));

    const data = [{
      data: [],
      labels: [],
      backgroundColor: [

      ],
      borderColor: '#fff'
    }];
    const labels: Array<string> = [];
    for (const id of preparationMethodIds) {
      data[0].data.push(brewView.filter((e: Brew)=>e.method_of_preparation === id).length);
      data[0].labels.push(this.uiPreparationStorage.getPreparationNameByUUID(id));
      labels.push(this.uiPreparationStorage.getPreparationNameByUUID(id));
    }

    const colorGradient = new Gradient();
    const color1 = '#CDC2AC';
    const color2 = '#607D8B';
    const color3 = '#BF658F';
    const color4 = '#E0A29A';

    colorGradient.setMidpoint(data[0].labels.length);

    colorGradient.setGradient(color1, color2, color3, color4);
    data[0].backgroundColor = colorGradient.getArray();



    const drinkingData = {
      labels: labels,
      datasets: data,
      titel:''
    };


    const chartOptions = {
      legend: {
        display: true,
        position: 'top'
      },
      plugins: {
        labels: {
          render: 'value'
        },
      },
      tooltips: {
        callbacks: {
          label:  (tooltipItem, mapData) =>{
            try {
              let label = ' ' + mapData.labels[tooltipItem.index] || '';

              if (label) {
                label += ': ';
              }

              const sum = mapData.datasets[0].data.reduce((accumulator, curValue) => {
                return accumulator + curValue;
              });
              const value = mapData.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];

              label += Number((value / sum) * 100).toFixed(2) + '%';
              return label;
            } catch (error) {

            }
          }
        }
      }
    };

    const preparationChartToDismiss = new Chart(this.preparationUsageChart.nativeElement, {
      type: 'pie',
      data: drinkingData,
      options: chartOptions
    } as any);
  }
}
