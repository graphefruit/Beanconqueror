import { Component, OnInit, ViewChild } from '@angular/core';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import {
  IonSlides,
  ModalController,
  NavParams,
  Platform,
} from '@ionic/angular';
import { UIHelper } from '../../../services/uiHelper';
import { Brew } from '../../../classes/brew/brew';
import { IBrew } from '../../../interfaces/brew/iBrew';
import { Settings } from '../../../classes/settings/settings';
import { Preparation } from '../../../classes/preparation/preparation';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { Chart } from 'chart.js';
import BREW_TRACKING from '../../../data/tracking/brewTracking';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIExcel } from '../../../services/uiExcel';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UIMillHelper } from '../../../services/uiMillHelper';
import { TranslateService } from '@ngx-translate/core';
import { BrewFlow, IBrewWaterFlow } from '../../../classes/brew/brewFlow';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIAlert } from '../../../services/uiAlert';
import { SocialSharing } from '@ionic-native/social-sharing/ngx';
import { BrewFlowComponent } from '../brew-flow/brew-flow.component';
import { ScreenOrientation } from '@ionic-native/screen-orientation/ngx';
import moment from 'moment';

@Component({
  selector: 'brew-detail',
  templateUrl: './brew-detail.component.html',
  styleUrls: ['./brew-detail.component.scss'],
})
export class BrewDetailComponent implements OnInit {
  public static COMPONENT_ID = 'brew-detail';
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  @ViewChild('photoSlides', { static: false }) public photoSlides: IonSlides;
  public data: Brew = new Brew();
  public settings: Settings;

  @ViewChild('cuppingChart', { static: false }) public cuppingChart;
  private brew: IBrew;
  public loaded: boolean = false;
  @ViewChild('flowProfileChart', { static: false }) public flowProfileChart;
  public flowProfileChartEl: any = undefined;

  public flow_profile_raw: BrewFlow = new BrewFlow();
  constructor(
    private readonly modalController: ModalController,
    private readonly navParams: NavParams,
    public uiHelper: UIHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiBrewHelper: UIBrewHelper,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiExcel: UIExcel,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly uiPreparationHelper: UIPreparationHelper,
    private readonly uiMillHelper: UIMillHelper,
    private readonly translate: TranslateService,
    private readonly uiFileHelper: UIFileHelper,
    private readonly uiAlert: UIAlert,
    private readonly socialSharing: SocialSharing,
    private readonly platform: Platform,
    private readonly screenOrientation: ScreenOrientation
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public async ionViewWillEnter() {
    this.uiAnalytics.trackEvent(
      BREW_TRACKING.TITLE,
      BREW_TRACKING.ACTIONS.DETAIL
    );
    this.brew = this.navParams.get('brew');
    if (this.brew) {
      const copy: IBrew = this.uiHelper.copyData(this.brew);
      this.data.initializeByObject(copy);
    }
    if (this.showCupping()) {
      // Set timeout else element wont be visible
      setTimeout(() => {
        this.__loadCuppingChart();
      }, 150);
    }

    await this.readFlowProfile();
    setTimeout(() => {
      this.initializeFlowChart();
    }, 150);

    this.loaded = true;
  }

  public async detailBean() {
    await this.uiBeanHelper.detailBean(this.data.getBean());
  }
  public async detailPreparation() {
    await this.uiPreparationHelper.detailPreparation(
      this.data.getPreparation()
    );
  }
  public async detailMill() {
    await this.uiMillHelper.detailMill(this.data.getMill());
  }

  public getPreparation(): Preparation {
    return this.data.getPreparation();
  }
  public showSectionAfterBrew(): boolean {
    return this.uiBrewHelper.showSectionAfterBrew(this.getPreparation());
  }
  public showSectionWhileBrew(): boolean {
    return this.uiBrewHelper.showSectionWhileBrew(this.getPreparation());
  }

  public showSectionBeforeBrew(): boolean {
    return this.uiBrewHelper.showSectionBeforeBrew(this.getPreparation());
  }
  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewDetailComponent.COMPONENT_ID
    );
  }

  public ngOnInit() {}
  public async edit() {
    const returningBrew: Brew = await this.uiBrewHelper.editBrew(this.data);
    if (returningBrew) {
      this.data = returningBrew;
      await this.readFlowProfile();
      this.initializeFlowChart();
    }
  }
  public formatSeconds(seconds: number, milliseconds) {
    const secs = seconds;
    let formattingStr: string = 'mm:ss';
    const millisecondsEnabled: boolean = this.settings.brew_milliseconds;
    if (millisecondsEnabled) {
      formattingStr = 'mm:ss.SSS';
    }
    const formatted = moment
      .utc(secs * 1000)
      .add('milliseconds', milliseconds)
      .format(formattingStr);
    return formatted;
  }
  private showCupping(): boolean {
    return this.uiBrewHelper.showCupping(this.data);
  }

  private __loadCuppingChart(): void {
    const chartObj = new Chart(
      this.cuppingChart.nativeElement,
      this.uiBrewHelper.getCuppingChartData(this.data) as any
    );
  }
  private initializeFlowChart(): void {
    setTimeout(() => {
      if (this.flowProfileChartEl) {
        this.flowProfileChartEl.destroy();
        this.flowProfileChartEl = undefined;
      }
      if (this.flowProfileChartEl === undefined) {
        let graphSettings = this.settings.graph.FILTER;
        if (
          this.data.getPreparation().style_type ===
          PREPARATION_STYLE_TYPE.ESPRESSO
        ) {
          graphSettings = this.settings.graph.ESPRESSO;
        }

        const drinkingData = {
          labels: [],
          datasets: [
            {
              label: this.translate.instant('BREW_FLOW_WEIGHT'),
              data: [],
              borderColor: 'rgb(205,194,172)',
              backgroundColor: 'rgb(205,194,172)',
              yAxisID: 'y',
              pointRadius: 0,
              tension: 0,
              borderWidth: 2,
              hidden: !graphSettings.weight,
            },
            {
              label: this.translate.instant('BREW_FLOW_WEIGHT_PER_SECOND'),
              data: [],
              borderColor: 'rgb(127,151,162)',
              backgroundColor: 'rgb(127,151,162)',
              yAxisID: 'y1',
              spanGaps: true,
              pointRadius: 0,
              tension: 0,
              borderWidth: 2,
              hidden: !graphSettings.calc_flow,
            },
            {
              label: this.translate.instant('BREW_FLOW_WEIGHT_REALTIME'),
              data: [],
              borderColor: 'rgb(9,72,93)',
              backgroundColor: 'rgb(9,72,93)',
              yAxisID: 'y2',
              spanGaps: true,
              pointRadius: 0,
              tension: 0,
              borderWidth: 2,
              hidden: !graphSettings.realtime_flow,
            },
          ],
        };
        if (
          this.flow_profile_raw.pressureFlow &&
          this.flow_profile_raw.pressureFlow.length > 0
        ) {
          drinkingData.datasets.push({
            label: this.translate.instant('BREW_PRESSURE_FLOW'),
            data: [],
            borderColor: 'rgb(5,199,147)',
            backgroundColor: 'rgb(5,199,147)',
            yAxisID: 'y3',
            spanGaps: true,
            pointRadius: 0,
            tension: 0,
            borderWidth: 2,
            hidden: !graphSettings.pressure,
          });
        }
        const suggestedMinFlow: number = 0;
        let suggestedMaxFlow: number = 20;

        const suggestedMinWeight: number = 0;
        let suggestedMaxWeight: number = 300;
        if (
          this.data.getPreparation().style_type ===
          PREPARATION_STYLE_TYPE.ESPRESSO
        ) {
          suggestedMaxFlow = 2.5;
          suggestedMaxWeight = 30;
        }
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

        if (
          this.flow_profile_raw.pressureFlow &&
          this.flow_profile_raw.pressureFlow.length > 0
        ) {
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
        }

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

        if (this.flow_profile_raw.weight.length > 0) {
          for (const data of this.flow_profile_raw.weight) {
            this.flowProfileChartEl.data.datasets[0].data.push(
              data.actual_weight
            );

            this.flowProfileChartEl.data.labels.push(data.brew_time);
          }
          for (const data of this.flow_profile_raw.waterFlow) {
            this.flowProfileChartEl.data.datasets[1].data.push(data.value);
          }
          if (this.flow_profile_raw.realtimeFlow) {
            for (const data of this.flow_profile_raw.realtimeFlow) {
              this.flowProfileChartEl.data.datasets[2].data.push(
                data.flow_value
              );
            }
          }

          if (
            this.flow_profile_raw.pressureFlow &&
            this.flow_profile_raw.pressureFlow.length > 0
          ) {
            for (const data of this.flow_profile_raw.pressureFlow) {
              this.flowProfileChartEl.data.datasets[3].data.push(
                data.actual_pressure
              );
            }
          }

          this.flowProfileChartEl.update();
        }
      }
    }, 250);
  }
  public async maximizeFlowGraph() {
    let actualOrientation;
    if (this.platform.is('cordova')) {
      actualOrientation = this.screenOrientation.type;
    }

    const oldCanvasHeight = document.getElementById(
      'canvasContainerBrew'
    ).offsetHeight;

    await new Promise(async (resolve) => {
      if (this.platform.is('cordova')) {
        await this.screenOrientation.lock(
          this.screenOrientation.ORIENTATIONS.LANDSCAPE
        );
      }
      resolve(undefined);
    });

    const modal = await this.modalController.create({
      component: BrewFlowComponent,
      id: BrewFlowComponent.COMPONENT_ID,
      breakpoints: [0, 1],
      initialBreakpoint: 1,
      cssClass: 'popover-actions',
      componentProps: {
        brewComponent: this,
        brew: this.data,
        flowChartEl: this.flowProfileChartEl,
        isDetail: true,
      },
    });
    await modal.present();
    await modal.onWillDismiss().then(async () => {
      // If responsive would be true, the add of the container would result into 0 width 0 height, therefore the hack
      this.flowProfileChartEl.options.responsive = false;

      this.flowProfileChartEl.update();

      if (this.platform.is('cordova')) {
        if (
          this.screenOrientation.type ===
          this.screenOrientation.ORIENTATIONS.LANDSCAPE
        ) {
          if (
            this.screenOrientation.ORIENTATIONS.LANDSCAPE === actualOrientation
          ) {
            // Get back to portrait
            setTimeout(async () => {
              await this.screenOrientation.lock(
                this.screenOrientation.ORIENTATIONS.PORTRAIT_PRIMARY
              );
            }, 50);
          }
        }
        setTimeout(() => {
          this.screenOrientation.unlock();
        }, 150);
      }

      await new Promise((resolve) => {
        setTimeout(async () => {
          document
            .getElementById('canvasContainerBrew')
            .append(this.flowProfileChartEl.ctx.canvas);
          resolve(undefined);
        }, 50);
      });

      await new Promise((resolve) => {
        setTimeout(async () => {
          // If we would not set the old height, the graph would explode to big.
          document.getElementById('canvasContainerBrew').style.height =
            oldCanvasHeight + 'px';
          this.flowProfileChartEl.options.responsive = true;
          this.flowProfileChartEl.update();
          resolve(undefined);
        }, 50);
      });
      this.flowProfileChartEl.resetZoom();
    });
  }
  private async readFlowProfile() {
    if (this.data.flow_profile !== '') {
      await this.uiAlert.showLoadingSpinner();
      const flowProfilePath =
        'brews/' + this.data.config.uuid + '_flow_profile.json';
      try {
        const jsonParsed = await this.uiFileHelper.getJSONFile(flowProfilePath);
        this.flow_profile_raw = jsonParsed;
      } catch (ex) {}

      await this.uiAlert.hideLoadingSpinner();
    }
  }
  public async downloadFlowProfile() {
    await this.uiExcel.exportBrewFlowProfile(this.flow_profile_raw);
  }
  public async shareFlowProfile() {
    const fileShare: string = this.flowProfileChartEl.toBase64Image(
      'image/jpeg',
      1
    );
    this.socialSharing.share(null, null, fileShare, null);
  }

  public getAvgFlow(): number {
    const waterFlows: Array<IBrewWaterFlow> = this.flow_profile_raw.waterFlow;
    let calculatedFlow: number = 0;
    let foundEntries: number = 0;
    for (const water of waterFlows) {
      if (water.value > 0) {
        calculatedFlow += water.value;
        foundEntries += 1;
      }
    }
    if (calculatedFlow > 0) {
      return calculatedFlow / foundEntries;
    }
    return 0;
  }
}
