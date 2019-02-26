/**Core**/
import {Component, ViewChild} from '@angular/core';
import {UIStatistic} from "../../services/uiStatistic";

import { Chart } from 'chart.js';
import {UIBrewStorage} from "../../services/uiBrewStorage";
import {Brew} from "../../classes/brew/brew";
import {IBrew} from "../../interfaces/brew/iBrew";
import {BrewView} from "../../classes/brew/brewView";
import {UIHelper} from "../../services/uiHelper";
@Component({
  templateUrl: 'statistics.html'
})
export class StatisticsPage {

  @ViewChild('drinkChart') drinkChart;


  constructor(
    public uiStatistic:UIStatistic,
    private uiBrewStorage:UIBrewStorage,
    private uiHelper:UIHelper,

  ) {

  }

  private __getBrewsSortedForMonth():Array<BrewView>{
    let  brewViews: Array<BrewView> = [];
    let brews:Array<Brew> = this.uiBrewStorage.getAllEntries();
//sort latest to top.
      let brewsCopy:Array<Brew> = [...brews];





      let sortedBrews: Array<IBrew> = brewsCopy.sort((obj1, obj2) => {
        if (obj1.config.unix_timestamp < obj2.config.unix_timestamp) {
          return -1;
        }
        if (obj1.config.unix_timestamp > obj2.config.unix_timestamp) {
          return 1;
        }
        return 0;
      });

      let collection = {};
      //Create collection
      for (let i = 0; i < sortedBrews.length; i++) {
        let month: string = this.uiHelper.formateDate(sortedBrews[i].config.unix_timestamp, 'MMMM');
        let year: string = this.uiHelper.formateDate(sortedBrews[i].config.unix_timestamp, 'YYYY');
        if (collection[month + " - " + year] === undefined) {
          collection[month + " - " + year] = {
            "BREWS": []
          }
        }
        collection[month + " - " + year]["BREWS"].push(sortedBrews[i]);
      }

      for (let key in collection) {
        let viewObj: BrewView = new BrewView();
        viewObj.title = key;
        viewObj.brews = collection[key].BREWS;

          brewViews.push(viewObj);

      }
      return brewViews;

  }
  private __loadDrinkingChart()
  {
    let brewView:Array<BrewView> = this.__getBrewsSortedForMonth();
    //Take the last 12 Months
    let lastBrewViews:Array<BrewView> = brewView.slice(-12);

    var drinkingData = {
      labels: [],
      datasets: [{
        label: "Getrunkene Tassen",
        data: [],
      }]
    };



    for (let i=0;i<lastBrewViews.length;i++){
      drinkingData.labels.push(lastBrewViews[i].title);

      for (let y=0;y<lastBrewViews.length;y++)
      {
        drinkingData.datasets[0].data.push(lastBrewViews[y].brews.length);
      }
    }
    var chartOptions = {
      legend: {
        display: true,
        position: 'top',

      }
    };

    let renderedChart = new Chart(this.drinkChart.nativeElement, {
      type: 'line',
      data: drinkingData,
      options: chartOptions
    });
  }
  ionViewDidLoad() {
    this.__loadDrinkingChart();
  }



}

