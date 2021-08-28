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

  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               public uiHelper: UIHelper,
               private readonly uiSettingsStorage: UISettingsStorage,
               private readonly uiBrewHelper: UIBrewHelper,
               private readonly uiAnalytics: UIAnalytics) {

    this.settings = this.uiSettingsStorage.getSettings();
  }

  public ionViewWillEnter() {
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
    setTimeout( ()=>{
      this.initializeFlowChart();
    },150);

    this.loaded = true;
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
    }


  }
  private showCupping(): boolean {
    return this.uiBrewHelper.showCupping(this.data);
  }

  private __loadCuppingChart(): void {
    const chartObj = new Chart(this.cuppingChart.nativeElement, this.uiBrewHelper.getCuppingChartData(this.data));
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
            label: '',
            data: [],
            borderColor: 'rgb(159,140,111)',
            backgroundColor: 'rgb(205,194,172)',
          }]
        };
        const chartOptions = {
          legend: {
            display: false,
            position: 'top'
          }
        };

        this.flowProfileChartEl = new Chart(this.flowProfileChart.nativeElement, {
          type: 'line',
          data: drinkingData,
          options: chartOptions
        });

        if (this.data.flow_profile.length > 0) {
          for (const data of this.data.flow_profile) {
            this.flowProfileChartEl.data.datasets[0].data.push(data.value);

            this.flowProfileChartEl.data.labels.push(data.time);
          }
          this.flowProfileChartEl.update();
        }
      }
    },250);
  }

}
