/** Core */
import {Component, ViewChild} from '@angular/core';
import {UIStatistic} from '../../services/uiStatistic';

import {Chart} from 'chart.js';
import {Brew} from '../../classes/brew/brew';
import {BrewView} from '../../classes/brew/brewView';
import {IBrew} from '../../interfaces/brew/iBrew';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {UIHelper} from '../../services/uiHelper';

@Component({
  templateUrl: 'statistics.html'
})
export class StatisticsPage {

  @ViewChild('drinkChart') public drinkChart;

  constructor(
    public uiStatistic: UIStatistic,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiHelper: UIHelper

  ) {

  }

  public ionViewDidLoad (): void {
    this.__loadDrinkingChart();
  }

  private __getBrewsSortedForMonth(): Array<BrewView> {
    const  brewViews: Array<BrewView> = [];
    const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
// sort latest to top.
    const brewsCopy: Array<Brew> = [...brews];

    const sortedBrews: Array<IBrew> = brewsCopy.sort((obj1, obj2) => {
        if (obj1.config.unix_timestamp < obj2.config.unix_timestamp) {
          return -1;
        }
        if (obj1.config.unix_timestamp > obj2.config.unix_timestamp) {
          return 1;
        }

        return 0;
      });

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

  private __loadDrinkingChart (): void {
    const brewView: Array<BrewView> = this.__getBrewsSortedForMonth();
    // Take the last 12 Months
    const lastBrewViews: Array<BrewView> = brewView.slice(-12);

    const drinkingData = {
      labels: [],
      datasets: [{
        label: 'Getrunkene Tassen',
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
        display: true,
        position: 'top'

      }
    };

    const renderedChart = new Chart(this.drinkChart.nativeElement, {
      type: 'line',
      data: drinkingData,
      options: chartOptions
    });
  }

}
