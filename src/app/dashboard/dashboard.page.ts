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
import {Chart, ChartConfiguration} from 'chart.js';
@Component({
  selector: 'dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {

  public brews: Array<Brew> = [];
  private leftOverBeansWeight: number = undefined;
  constructor(public uiStatistic: UIStatistic,
              private readonly modalCtrl: ModalController,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiBrewHelper: UIBrewHelper,
              private readonly changeDetectorRef: ChangeDetectorRef,
              private readonly router: Router,
              private readonly uiBeanStorage: UIBeanStorage,
              private readonly uiBeanHelper: UIBeanHelper
  ) {
    this.initializeFlowChart();
  }
  @ViewChild('flowProfileChart', {static: false}) public flowProfileChart;

  public flowProfileChartEl: any = undefined;
  private initializeFlowChart(): void {

    setTimeout(() => {
      if (this.flowProfileChartEl) {
        this.flowProfileChartEl.destroy();
        this.flowProfileChartEl = undefined;

      }
      if (this.flowProfileChartEl === undefined) {
        const drinkingData = {
          labels: [0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9],
          datasets: [{
            label: '1',
            //data:[],
             data: [4,5,6,4,3,3,1,2,3],
            borderColor: 'rgb(159,140,111)',
            backgroundColor: 'rgb(205,194,172)',
            yAxisID: 'y',
            pointRadius: 0,
          },{
            label: '2',
           // data:[],
            data: [11,12,undefined,undefined,undefined,12,72,81,9],
            borderColor: 'rgb(96,125,139)',
            backgroundColor: 'rgb(127,151,162)',
            yAxisID: 'y1',
            spanGaps: true,
          }]
        };
        const chartOptions = {

          animation: false,
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
                display: false,
                position: 'right',
                // grid line settings
                grid: {
                  drawOnChartArea: false, // only want the grid lines for one axis to show up
                },
              },
              xAxis: {
                ticks: {
                  maxTicksLimit: 50
                }
              },

            }

        };


        this.flowProfileChartEl = new Chart(this.flowProfileChart.nativeElement, {
          type: 'line',
          data: drinkingData,
          options: chartOptions
        }as any);

      }
    },1000);
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
