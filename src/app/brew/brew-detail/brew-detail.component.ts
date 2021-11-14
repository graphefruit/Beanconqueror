import {Component, OnInit, ViewChild} from '@angular/core';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {IonSlides, ModalController, NavParams} from '@ionic/angular';
import {UIHelper} from '../../../services/uiHelper';
import {Brew} from '../../../classes/brew/brew';
import {IBrew} from '../../../interfaces/brew/iBrew';
import {Settings} from '../../../classes/settings/settings';
import {Preparation} from '../../../classes/preparation/preparation';
import {PREPARATION_STYLE_TYPE} from '../../../enums/preparations/preparationStyleTypes';
import {UIBrewHelper} from '../../../services/uiBrewHelper';
import {Chart} from 'chart.js';
import BREW_TRACKING from '../../../data/tracking/brewTracking';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {UIExcel} from '../../../services/uiExcel';
import {UIBeanHelper} from '../../../services/uiBeanHelper';
import {UIPreparationHelper} from '../../../services/uiPreparationHelper';
import {UIMillHelper} from '../../../services/uiMillHelper';
import {TranslateService} from '@ngx-translate/core';
import {BrewFlow} from '../../../classes/brew/brewFlow';
import {UIFileHelper} from '../../../services/uiFileHelper';

@Component({
  selector: 'brew-detail',
  templateUrl: './brew-detail.component.html',
  styleUrls: ['./brew-detail.component.scss'],
})
export class BrewDetailComponent implements OnInit {
  public static COMPONENT_ID = 'brew-detail';
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  @ViewChild('photoSlides', {static: false}) public photoSlides: IonSlides;
  public data: Brew = new Brew();
  public settings: Settings;

  @ViewChild('cuppingChart', {static: false}) public cuppingChart;
  private brew: IBrew;
  public loaded: boolean = false;
  @ViewChild('flowProfileChart', {static: false}) public flowProfileChart;
  public flowProfileChartEl: any = undefined;

  public flow_profile_raw: BrewFlow = new BrewFlow();
  constructor (private readonly modalController: ModalController,
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
               private readonly uiFileHelper: UIFileHelper) {

    this.settings = this.uiSettingsStorage.getSettings();
  }

  public async ionViewWillEnter() {
    this.uiAnalytics.trackEvent(BREW_TRACKING.TITLE, BREW_TRACKING.ACTIONS.DETAIL);
    this.brew = this.navParams.get('brew');
    if (this.brew) {
      const copy: IBrew = this.uiHelper.copyData(this.brew);
      this.data.initializeByObject(copy);
    }
    if (this.showCupping())
    {
      // Set timeout else element wont be visible
      setTimeout( () => {
        this.__loadCuppingChart();
      },150);
    }
    await this.readFlowProfile();
    setTimeout( ()=>{
      this.initializeFlowChart();
    },150);

    this.loaded = true;

  }

  public async detailBean() {
    await this.uiBeanHelper.detailBean(this.data.getBean());
  }
  public async detailPreparation() {
    await this.uiPreparationHelper.detailPreparation(this.data.getPreparation());
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
    this.modalController.dismiss({
      dismissed: true
    },undefined,BrewDetailComponent.COMPONENT_ID);
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
  private showCupping(): boolean {
    return this.uiBrewHelper.showCupping(this.data);
  }

  private __loadCuppingChart(): void {
    const chartObj = new Chart(this.cuppingChart.nativeElement, this.uiBrewHelper.getCuppingChartData(this.data) as any);
  }
  private initializeFlowChart(): void {

    setTimeout(() => {
      if (this.flowProfileChartEl) {
        this.flowProfileChartEl.destroy();
        this.flowProfileChartEl = undefined;
      }
      if (this.flowProfileChartEl === undefined) {
        const drinkingData = {
          labels: [],
          datasets: [{
            label: this.translate.instant('BREW_FLOW_WEIGHT'),
            data: [],
            borderColor: 'rgb(159,140,111)',
            backgroundColor: 'rgb(205,194,172)',
            yAxisID: 'y',
            pointRadius: 0,
          },
            {
              label: this.translate.instant('BREW_FLOW_WEIGHT_PER_SECOND'),
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
                maxTicksLimit: 10
              }
            }
          }
        };

        this.flowProfileChartEl = new Chart(this.flowProfileChart.nativeElement, {
          type: 'line',
          data: drinkingData,
          options: chartOptions
        } as any);

        if (this.flow_profile_raw.weight.length > 0) {
          for (const data of this.flow_profile_raw.weight) {
            this.flowProfileChartEl.data.datasets[0].data.push(data.actual_weight);

            this.flowProfileChartEl.data.labels.push(data.brew_time);
          }
          for (const data of this.flow_profile_raw.waterFlow) {
            this.flowProfileChartEl.data.datasets[1].data.push(data.value);
          }
          this.flowProfileChartEl.update();
        }
      }
    },250);
  }

  private async readFlowProfile() {
    if (this.data.flow_profile !== '') {
      const flowProfilePath = 'brews/' + this.data.config.uuid + '_flow_profile.json';
      const jsonParsed = await this.uiFileHelper.getJSONFile(flowProfilePath);
      this.flow_profile_raw = jsonParsed;
    }
  }
  public async downloadFlowProfile() {
    await this.uiExcel.exportBrewFlowProfile(this.flow_profile_raw);
  }

}
