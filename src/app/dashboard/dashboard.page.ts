import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { UIStatistic } from '../../services/uiStatistic';
import { ModalController } from '@ionic/angular';
import { Brew } from '../../classes/brew/brew';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import { BREW_ACTION } from '../../enums/brews/brewAction';
import { Router } from '@angular/router';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { Bean } from '../../classes/bean/bean';
import { UIBeanHelper } from '../../services/uiBeanHelper';

import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { Chart } from 'chart.js';
import moment from 'moment';
declare var Plotly;

@Component({
  selector: 'dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  public brews: Array<Brew> = [];
  private leftOverBeansWeight: number = undefined;
  @ViewChild('flowProfileChart', { static: false }) public flowProfileChart;
  public flowProfileChartEl: any = undefined;

  constructor(
    public uiStatistic: UIStatistic,
    private readonly modalCtrl: ModalController,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiBrewHelper: UIBrewHelper,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly router: Router,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly uiSettingsStorage: UISettingsStorage
  ) {}

  public ngOnInit() {
    this.uiBrewStorage.attachOnEvent().subscribe((_val) => {
      // If an brew is deleted, we need to reset our array for the next call.
      this.leftOverBeansWeight = undefined;
    });

    this.uiBeanStorage.attachOnEvent().subscribe((_val) => {
      // If an brew is deleted, we need to reset our array for the next call.
      this.leftOverBeansWeight = undefined;
    });
    setTimeout(() => {
      // this.initializeFlowChart();
    }, 2000);
  }
  public testi() {
    this.flowProfileChartEl.pan({ x: -100 }, undefined, 'default');
    this.flowProfileChartEl.update();
  }
  public initializeFlowChart(): void {
    let i = 0;

    var trace1 = {
      x: [],
      y: [],
      name: 'yaxis1 data',
      type: 'scatter',
      line: { shape: 'spline' },
    };
    var trace2 = {
      x: [],
      y: [],
      name: 'yaxis2 data',
      yaxis: 'y2',
      type: 'scatter',
      line: { shape: 'spline' },
    };

    var trace3 = {
      x: [],
      y: [],
      name: 'yaxis3 data',
      yaxis: 'y3',
      type: 'scatter',
      line: { shape: 'spline' },
    };

    var trace4 = {
      x: [],
      y: [],
      name: 'yaxis4 data',
      yaxis: 'y4',
      type: 'scatter',
      line: { shape: 'spline' },
    };

    let tickformat = '%S.%L';
    if (i === 400) {
      tickformat = '%M:%S.%L';
    }
    const chartData = [trace1, trace2, trace3, trace4];
    const config = {
      displayModeBar: false, // this is the line that hides the bar.
    };
    const layout = {
      margin: {
        l: 20,
        r: 20,
        b: 20,
        t: 20,
        pad: 4,
      },
      showlegend: true,
      legend: { orientation: 'h' },
      xaxis: { tickformat: tickformat },
      yaxis: {
        title: 'yaxis title',
        titlefont: { color: '#1f77b4' },
        tickfont: { color: '#1f77b4' },
      },
      yaxis2: {
        title: 'yaxis2 title',
        titlefont: { color: '#ff7f0e' },
        tickfont: { color: '#ff7f0e' },
        anchor: 'free',
        overlaying: 'y',
        side: 'left',
        position: 0.15,
      },
      yaxis3: {
        title: 'yaxis4 title',
        titlefont: { color: '#d62728' },
        tickfont: { color: '#d62728' },
        anchor: 'x',
        overlaying: 'y',
        side: 'right',
      },
      yaxis4: {
        title: 'yaxis5 title',
        titlefont: { color: '#9467bd' },
        tickfont: { color: '#9467bd' },
        anchor: 'free',
        overlaying: 'y',
        side: 'right',
        position: 0.85,
      },
    };

    Plotly.newPlot('myDiv', chartData, layout, config);

    let weight = 0;
    let realtime_flow = 0;
    let flow = 0;
    let pressure = 0;
    const startingFlowTime = Date.now();
    const startingDay = moment(new Date()).startOf('day');

    const delay = Date.now() - startingDay.toDate().getTime();

    setInterval(() => {
      i = i + 1;
      flow = Math.floor(Math.random() * 11);
      realtime_flow = Math.floor(Math.random() * 11);
      weight = weight + Math.floor(Math.random() * 11);
      pressure = Math.floor(Math.random() * 11);
      const flowObj = {
        unixTime: moment(new Date())
          .startOf('day')
          .add('milliseconds', Date.now() - startingFlowTime)
          .toDate()
          .getTime(),
        weight: weight,
        realtime_flow: realtime_flow,
        flow: flow,
        date: null,
      };
      flowObj.date = new Date(flowObj.unixTime);

      trace1.x.push(flowObj.date);
      trace1.y.push(flowObj.weight);

      trace2.x.push(flowObj.date);
      trace2.y.push(flowObj.flow);

      trace3.x.push(flowObj.date);
      trace3.y.push(flowObj.realtime_flow);

      trace4.x.push(flowObj.date);
      trace4.y.push(pressure);
      if (i === 400) {
        tickformat = '%M:%S.%L';
      }

      Plotly.newPlot('myDiv', chartData, layout, config);
    }, 100);

    return;
    setTimeout(() => {
      if (this.flowProfileChartEl) {
        this.flowProfileChartEl.destroy();
        this.flowProfileChartEl = undefined;
      }
      if (this.flowProfileChartEl === undefined) {
        const drinkingData = {
          labels: [],
          datasets: [
            {
              label: 'BREW_FLOW_WEIGHT',
              data: [],
              borderColor: 'rgb(205,194,172)',
              backgroundColor: 'rgb(205,194,172)',
              yAxisID: 'y',
              pointRadius: 0,
              tension: 0,
              borderWidth: 2,
              hidden: false,
            },
            {
              label: 'BREW_FLOW_WEIGHT_PER_SECOND',
              data: [],
              borderColor: 'rgb(127,151,162)',
              backgroundColor: 'rgb(127,151,162)',
              yAxisID: 'y1',
              spanGaps: true,
              pointRadius: 0,
              tension: 0,
              borderWidth: 2,
              hidden: false,
            },
            {
              label: 'BREW_FLOW_WEIGHT_REALTIME',
              data: [],
              borderColor: 'rgb(9,72,93)',
              backgroundColor: 'rgb(9,72,93)',
              yAxisID: 'y2',
              spanGaps: true,
              pointRadius: 0,
              tension: 0,
              borderWidth: 2,
              hidden: false,
            },
          ],
        };

        drinkingData.datasets.push({
          label: 'BREW_PRESSURE_FLOW',
          data: [],
          borderColor: 'rgb(5,199,147)',
          backgroundColor: 'rgb(5,199,147)',
          yAxisID: 'y3',
          spanGaps: true,
          pointRadius: 0,
          tension: 0,
          borderWidth: 2,
          hidden: false,
        });

        const suggestedMinFlow: number = 0;
        let suggestedMaxFlow: number = 20;

        const suggestedMinWeight: number = 0;
        let suggestedMaxWeight: number = 300;

        const chartOptions = {
          plugins: {
            backgroundColorPlugin: {},
            zoom: {
              pan: {
                enabled: true,
                mode: 'x',
              },
              zoom: {
                wheel: {
                  enabled: false,
                },
                drag: {
                  enabled: true,
                },
                pinch: {
                  enabled: true,
                },
                mode: 'x',
              },
            },
          },
          animation: true,
          legend: {
            display: false,
            position: 'top',
          },
          responsive: true,
          maintainAspectRatio: false,
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
              suggestedMin: suggestedMinWeight,
              suggestedMax: suggestedMaxWeight,
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              // grid line settings
              grid: {
                drawOnChartArea: false, // only want the grid lines for one axis to show up
              },
              suggestedMin: suggestedMinFlow,
              suggestedMax: suggestedMaxFlow,
            },
            y2: {
              // Real time flow
              type: 'linear',
              display: false,
              position: 'right',
              // grid line settings
              grid: {
                drawOnChartArea: false, // only want the grid lines for one axis to show up
              },
              suggestedMin: suggestedMinFlow,
              suggestedMax: suggestedMaxFlow,
            },
            xAxis: {
              ticks: {
                maxTicksLimit: 10,
              },
            },
          },
        };

        chartOptions.scales['y3'] = {
          type: 'linear',
          display: true,
          position: 'right',
          // grid line settings
          grid: {
            drawOnChartArea: false, // only want the grid lines for one axis to show up
          },
          // More then 12 bar should be strange.
          suggestedMin: 0,
          suggestedMax: 12,
        };

        this.flowProfileChartEl = new Chart(
          this.flowProfileChart.nativeElement,
          {
            type: 'line',
            data: drinkingData,
            options: chartOptions,
            plugins: [
              {
                id: 'backgroundColorPlugin',
                beforeDraw: (chart, args, options) => {
                  const ctx = chart.canvas.getContext('2d');
                  ctx.save();
                  ctx.globalCompositeOperation = 'destination-over';
                  ctx.fillStyle = 'white';
                  ctx.fillRect(0, 0, chart.width, chart.height);
                  ctx.restore();
                },
              },
            ],
          } as any
        );

        let weight = 0;
        let realtime_flow = 0;
        let flow = 0;
        let pressure = 0;
        const startingFlowTime = Date.now();
        const startingDay = moment(new Date()).startOf('day');

        const delay = Date.now() - startingDay.toDate().getTime();

        setInterval(() => {
          flow = Math.floor(Math.random() * 11);
          realtime_flow = Math.floor(Math.random() * 11);
          weight = weight + Math.floor(Math.random() * 11);
          pressure = Math.floor(Math.random() * 11);
          const flowObj = {
            unixTime: moment(new Date())
              .startOf('day')
              .add('milliseconds', Date.now() - startingFlowTime)
              .toDate()
              .getTime(),
            weight: weight,
            realtime_flow: realtime_flow,
            flow: flow,
          };

          this.flowProfileChartEl.data.labels.push(flowObj.unixTime);
          this.flowProfileChartEl.data.datasets[0].data.push({
            x: flowObj.unixTime,
            y: weight,
          });
          this.flowProfileChartEl.data.datasets[1].data.push({
            x: flowObj.unixTime,
            y: flow,
          });
          this.flowProfileChartEl.data.datasets[2].data.push({
            x: flowObj.unixTime,
            y: realtime_flow,
          });
          this.flowProfileChartEl.data.datasets[3].data.push({
            x: flowObj.unixTime,
            y: pressure,
          });

          debugger;
          this.flowProfileChartEl.update();
        }, 100);

        this.flowProfileChartEl.update();
      }
    }, 250);
  }
  public ionViewWillEnter() {
    this.loadBrews();
  }

  public loadBrews() {
    this.brews = this.uiBrewStorage.getAllEntries();
    this.brews = UIBrewHelper.sortBrews(this.brews);
    const settings = this.uiSettingsStorage.getSettings();
    if (settings.show_archived_brews_on_dashboard === false) {
      this.brews = this.brews.filter(
        (e) =>
          e.getBean().finished === false &&
          e.getMill().finished === false &&
          e.getPreparation().finished === false
      );
    }
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
      const openBeans: Array<Bean> = this.uiBeanStorage
        .getAllEntries()
        .filter((bean) => !bean.finished);
      for (const bean of openBeans) {
        if (bean.weight > 0) {
          leftOverCount += bean.weight - this.getUsedWeightCount(bean);
        }
      }

      this.leftOverBeansWeight = leftOverCount;
    }
    if (this.leftOverBeansWeight < 1000) {
      return Math.round(this.leftOverBeansWeight * 100) / 100 + ' g';
    } else {
      return Math.round((this.leftOverBeansWeight / 1000) * 100) / 100 + ' kg';
    }
  }

  public getUsedWeightCount(_bean: Bean): number {
    let usedWeightCount: number = 0;
    const relatedBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(
      _bean.config.uuid
    );
    for (const brew of relatedBrews) {
      usedWeightCount += brew.grind_weight;
    }
    return usedWeightCount;
  }
}
