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
@Component({
  selector: 'statistic',
  templateUrl: './statistic.page.html',
  styleUrls: ['./statistic.page.scss'],
})
export class StatisticPage implements OnInit {

  @ViewChild('brewChart', {static: false}) public brewChart;
  @ViewChild('drinkingChart', {static: false}) public drinkingChart;
  @ViewChild('preparationUsageChart', {static: false}) public preparationUsageChart;
  @ViewChild('grindingChart', {static: false}) public grindingChart;
  @ViewChild('preparationUsageTimelineChart', {static: false}) public preparationUsageTimelineChart;

  constructor(
    public uiStatistic: UIStatistic,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiHelper: UIHelper,
    private translate: TranslateService
  ) {


  }

  public ionViewDidEnter(): void {
    this.__loadBrewChart();
    this.__loadDrinkingChart();
    this.__loadPreparationUsageChart();
    this.__loadGrindingChart();
    this.__loadPreparationUsageTimelineChart();
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

  private __loadPreparationUsageTimelineChart(): void {
    const brewEntries: Array<Brew> = this.uiBrewStorage.getAllEntries();
    const brewView: Array<BrewView> = this.__getBrewsSortedForMonth();
    // Take the last 12 Months
    const lastBrewViews: Array<BrewView> = brewView.slice(-12);

    const preparationMethodIds:Array<string> = Array.from(new Set(brewEntries.map((e:Brew) => e.method_of_preparation)));

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
          foundDataset[0].DATA.push(forBrew.brews.filter((e:Brew)=>e.method_of_preparation === id).length);
        } else {
          const newDataObj:any = {
            UUID: id,
            DATA: [],
            LABEL: this.uiPreparationStorage.getPreparationNameByUUID(id),
          };

          datasets.push(newDataObj);
        }

      }

    }

    const colorGradient = new Gradient();
    const color1 = '#3F2CAF';
    const color2 = '#e9446a';
    const color3 = '#edc988';
    const color4 = '#607D8B';

    colorGradient.setMidpoint(datasets.length);
    colorGradient.setGradient(color1, color2, color3, color4);

    const colorArray = colorGradient.getArray();
    for (let i=0;i<datasets.length;i++) {
      const prepObj:any = {
        label: datasets[i].LABEL,
        data: datasets[i].DATA,
        backgroundColor: colorArray[i]
      };
      data.datasets.push(prepObj);
    }

    const chartOptions = {
      responsive: true,
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
    });

  }
  private __loadDrinkingChart(): void {
    const brewView: Array<BrewView> = this.__getBrewsSortedForMonth();
    // Take the last 12 Months
    const lastBrewViews: Array<BrewView> = brewView.slice(-12);

    const drinkingData = {
      labels: [],
      datasets: [{
        label: this.translate.instant('PAGE_STATISTICS_DRUNKEN_QUANTITY') + ' (kg/l)',
        data: []
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
    });
  }
  private __loadBrewChart(): void {
    const brewView: Array<BrewView> = this.__getBrewsSortedForMonth();
    // Take the last 12 Months
    const lastBrewViews: Array<BrewView> = brewView.slice(-12);

    const drinkingData = {
      labels: [],
      datasets: [{
        label: this.translate.instant('PAGE_STATISTICS_BREW_PROCESSES'),
        data: []
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
    });
  }

  private __loadGrindingChart(): void {
    const brewView: Array<BrewView> = this.__getBrewsSortedForMonth();
    // Take the last 12 Months
    const lastBrewViews: Array<BrewView> = brewView.slice(-12);

    const drinkingData = {
      labels: [],
      datasets: [{
        label: this.translate.instant('PAGE_STATISTICS_BEAN_WEIGHT_USED'),
        data: []
      }]
    };

    for (const forBrew of lastBrewViews) {
      drinkingData.labels.push(forBrew.title);
    }
    for (const forBrew of lastBrewViews) {
      let weightCount: number = 0;
      for (const brew of forBrew.brews) {
        weightCount += brew.grind_weight
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
    });
  }
  private __loadPreparationUsageChart(): void {
    const brewView: Array<Brew> = this.uiBrewStorage.getAllEntries();
    const preparationMethodIds:Array<string> = Array.from(new Set(brewView.map((e:Brew) => e.method_of_preparation)));

    const data = [{
      data: [],
      labels: [],
      backgroundColor: [

      ],
      borderColor: '#fff'
    }];
    const labels:Array<string> = [];
    for (const id of preparationMethodIds) {
      data[0].data.push(brewView.filter((e:Brew)=>e.method_of_preparation === id).length);
      data[0].labels.push(this.uiPreparationStorage.getPreparationNameByUUID(id));
      labels.push(this.uiPreparationStorage.getPreparationNameByUUID(id));
    }

    const colorGradient = new Gradient();

    const color1 = '#3F2CAF';
    const color2 = '#e9446a';
    const color3 = '#edc988';
    const color4 = '#607D8B';

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
              console.log(error);
            }
          }
        }
      }
    };

    const preparationChartToDismiss = new Chart(this.preparationUsageChart.nativeElement, {
      type: 'pie',
      data: drinkingData,
      options: chartOptions
    });
  }
}
