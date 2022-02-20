import {ChangeDetectorRef, Component, OnInit, ViewChild} from '@angular/core';
import {UIStatistic} from '../../services/uiStatistic';
import {ModalController} from '@ionic/angular';
import {Brew} from '../../classes/brew/brew';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {UIBrewHelper} from '../../services/uiBrewHelper';
import {BREW_ACTION} from '../../enums/brews/brewAction';
import {Router} from '@angular/router';
import {UIBeanStorage} from '../../services/uiBeanStorage';
import {Bean} from '../../classes/bean/bean';
import {UIBeanHelper} from '../../services/uiBeanHelper';
import {Chart} from 'chart.js';
import moment from 'moment';

@Component({
  selector: 'dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {

  public brews: Array<Brew> = [];
  private leftOverBeansWeight: number = undefined;
 /*public flowProfileChartEl: any = undefined;
   @ViewChild('flowProfileChart', { static: false }) public flowProfileChart;*/
  constructor(public uiStatistic: UIStatistic,
              private readonly modalCtrl: ModalController,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiBrewHelper: UIBrewHelper,
              private readonly changeDetectorRef: ChangeDetectorRef,
              private readonly router: Router,
              private readonly uiBeanStorage: UIBeanStorage,
              private readonly uiBeanHelper: UIBeanHelper
  ) {


//setTimeout(() => {this.b();},500);
    //setTimeout(() => {this.liveSample();},500);
  }


/**private liveSample() {
  const drinkingData = {
    labels: [],
    datasets: [{
      label: "asd",
      data: [],
      borderColor: 'rgb(159,140,111)',
      backgroundColor: 'rgb(205,194,172)',
      yAxisID: 'y',
      pointRadius: 0,
      borderWidth: 1,
    },
      {
        label: "111",
        data: [],
        borderColor: 'rgb(96,125,139)',
        backgroundColor: 'rgb(127,151,162)',
        yAxisID: 'y1',
        spanGaps: true,
        pointRadius: 0,

      }]
  };

  const delay = Date.now() - moment(new Date()).startOf('day').toDate().getTime();

  const chartOptions = {
    animation: false,  // disable animati
    scales: {
      x: {
        type: 'realtime',
        display: true,
        realtime: {

          // How much timeseconds do we want to show
          duration: 5000,
          // when to pull new values
          pause: true,
          refresh: 100,
          delay: delay,
          // data will be automatically deleted as it disappears off the chart
          ttl: undefined,
          onRefresh: (chart) => {

          }

        },
        time: {
          displayFormats: {
            'millisecond': 'mm:ss',
            'second': 'mm:ss',
            'minute': 'mm:ss',
            'hour': 'mm:ss',
            'day': 'mm:ss',
            'week': 'mm:ss',
            'month': 'mm:ss',
            'quarter': 'mm:ss',
            'year': 'mm:ss',
          }
        }
      },

      y: {
        type: 'linear',
        display: true,
        position: 'left',
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        // grid line settings
        grid: {
          drawOnChartArea: false, // only want the grid lines for one axis to show up
        },
        spanGaps: true,
      }
    },
    interaction: {
      intersect: false
    }
  };

console.error("ASHDASDAJSDJASD");
 this.flowProfileChartEl = new Chart(this.flowProfileChart.nativeElement, {
    type: 'line',
    data: drinkingData,
    options: chartOptions
  } as any);
  window["hello"] = this.flowProfileChartEl;
  console.log("test");
  this.flowProfileChartEl.update();

  let second = 0;
let tick = 0;
  const startOfDay =  moment(new Date()).startOf('day');

  window["hellow"] = setInterval(() => {

    tick = tick +1;

    if (tick === 10) {
      this.flowProfileChartEl.data.datasets[1].data.push({x: startOfDay.add('seconds',second + "." + tick).toDate().getTime(),y:this.getRandomInt(0,100)});
    } else {
      this.flowProfileChartEl.data.datasets[1].data.push({x: startOfDay.add('seconds',second + "." + tick).toDate().getTime(),y:this.getRandomInt(0,100)});
    }


    if (tick > 10) {
second = second+1;
tick =0;
    }
  },100);

}**/
  /***s
private notLiveSample() {
  const drinkingData = {
    labels: [],
    datasets: [{
      label: "asd",
      data: [],
      borderColor: 'rgb(159,140,111)',
      backgroundColor: 'rgb(205,194,172)',
      yAxisID: 'y',
      pointRadius: 0,
    },
      {
        label:"asd",
        data: [],
        borderColor: 'rgb(96,125,139)',
        backgroundColor: 'rgb(127,151,162)',
        yAxisID: 'y1',
        spanGaps: true,
        pointRadius: 0,
      }]
  };
  const chartOptions = {
    animation: true,
    legend: {
      display: false,
      position: 'top'
    },
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    stacked: false,

    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        // grid line settings
        grid: {
          drawOnChartArea: false, // only want the grid lines for one axis to show up
        },
      },
      xAxis: {
        ticks: {
          maxTicksLimit: 5,
          min: 2,
          max: 6
        }
      }
    }
  };

  this.flowProfileChartEl = new Chart(this.flowProfileChart.nativeElement, {
    type: 'line',
    data: drinkingData,
    options: chartOptions
  } as any);


    this.flowProfileChartEl.update();
    let second =0;
    let bla = 0;

    let index=0;
setInterval(() => {
  second = second + 0.1;
  bla = bla +0.2;
  this.flowProfileChartEl.data.labels.push(second);
  this.flowProfileChartEl.data.datasets[0].data.push(this.getRandomInt(0,100));

 // this.flowProfileChartEl.data.datasets[1].data.push({x: second,y:bla});

},100);

setInterval(() => {
  this.flowProfileChartEl.update('none');
},60);

}***/
  public getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  public  ngOnInit() {

    this.uiBrewStorage.attachOnEvent().subscribe((_val) => {
      // If an brew is deleted, we need to reset our array for the next call.
      this.leftOverBeansWeight = undefined;
    });

    this.uiBeanStorage.attachOnEvent().subscribe((_val) => {
      // If an brew is deleted, we need to reset our array for the next call.
      this.leftOverBeansWeight = undefined;
    });
  }

  public ionViewWillEnter() {
    this.loadBrews();
  }

  public loadBrews() {
    this.brews = this.uiBrewStorage.getAllEntries();
    this.brews = UIBrewHelper.sortBrews(this.brews);
    this.brews = this.brews.slice(0, 10);
    this.changeDetectorRef.detectChanges();
  }

  public async addBrew() {

      await this.uiBrewHelper.addBrew();
      this.loadBrews();
      this.router.navigate(['/home/brews']);
  }

  public async longPressAdd(event: Event) {
    event.preventDefault();
    event.cancelBubble = true;

    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.uiBrewHelper.longPressAddBrew();
    this.loadBrews();
    this.router.navigate(['/home/brews']);
  }

  public getBrews() {
    return this.brews;
  }

  public async brewAction(action: BREW_ACTION, brew: Brew): Promise<void> {
    this.loadBrews();
  }


  public openBeansLeftOverCount(): string {
    // #183
    if (this.leftOverBeansWeight === undefined) {
      let leftOverCount: number = 0;
      const openBeans: Array<Bean> = this.uiBeanStorage.getAllEntries().filter(
        (bean) => !bean.finished);
      for (const bean of openBeans) {

        if (bean.weight > 0) {
          leftOverCount  += (bean.weight - this.getUsedWeightCount(bean));
        }
      }


      this.leftOverBeansWeight = leftOverCount;
    }
    if (this.leftOverBeansWeight <1000) {
      return (Math.round(this.leftOverBeansWeight * 100) / 100 )+ ' g';

    } else {
      return (Math.round((this.leftOverBeansWeight / 1000) * 100) / 100) + ' kg';
    }

  }

  public getUsedWeightCount(_bean: Bean): number {
    let usedWeightCount: number = 0;
    const relatedBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(_bean.config.uuid);
    for (const brew of relatedBrews) {
      usedWeightCount += brew.grind_weight;
    }
    return usedWeightCount;
  }


}
