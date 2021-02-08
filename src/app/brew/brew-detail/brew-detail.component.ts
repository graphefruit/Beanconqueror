import {Component, OnInit, ViewChild} from '@angular/core';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {IonSlides, ModalController, NavParams} from '@ionic/angular';
import {UIHelper} from '../../../services/uiHelper';
import {Brew} from '../../../classes/brew/brew';
import {IBrew} from '../../../interfaces/brew/iBrew';
import {Settings} from '../../../classes/settings/settings';
import {Preparation} from '../../../classes/preparation/preparation';
import {PREPARATION_STYLE_TYPE} from '../../../enums/preparations/preparationStyleTypes';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {UIBrewHelper} from '../../../services/uiBrewHelper';
import {TranslateService} from '@ngx-translate/core';
import {Chart} from 'chart.js';

@Component({
  selector: 'brew-detail',
  templateUrl: './brew-detail.component.html',
  styleUrls: ['./brew-detail.component.scss'],
})
export class BrewDetailComponent implements OnInit {

  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  @ViewChild('photoSlides', {static: false}) public photoSlides: IonSlides;
  public data: Brew = new Brew();
  public settings: Settings;

  @ViewChild('cuppingChart', {static: false}) public cuppingChart;
  private brew: IBrew;
  public loaded:boolean = false;
  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               public uiHelper: UIHelper,
               private readonly uiSettingsStorage: UISettingsStorage,
               private readonly uiAnalytics: UIAnalytics,
               private readonly uiBrewHelper: UIBrewHelper,
               private readonly translate: TranslateService) {

    this.settings = this.uiSettingsStorage.getSettings();
  }

  public ionViewWillEnter() {
    this.uiAnalytics.trackEvent('BREW', 'DETAIL');
    this.brew = this.navParams.get('brew');
    if (this.brew) {
      const copy: IBrew = this.uiHelper.copyData(this.brew);
      this.data.initializeByObject(copy);
    }
    if (this.showCupping())
    {
      //Set timeout else element wont be visible
      setTimeout( () => {
        this.__loadCuppingChart();
      },150);
    }

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
    },undefined,'brew-detail');
  }

  public ngOnInit() {}

  private showCupping() {
    return (this.data.cupping.dry_fragrance > 0 ||
      this.data.cupping.wet_aroma > 0 ||
      this.data.cupping.brightness > 0 ||
      this.data.cupping.flavor > 0 ||
      this.data.cupping.body > 0 ||
      this.data.cupping.finish > 0 ||
      this.data.cupping.sweetness > 0 ||
      this.data.cupping.clean_cup > 0 ||
      this.data.cupping.complexity > 0 ||
      this.data.cupping.uniformity > 0);
  }

  private __loadCuppingChart(): void {


    const cuppingData = {
      labels: [
        this.translate.instant('CUPPING_SCORE_DRY_FRAGRANCE'),
        this.translate.instant('CUPPING_SCORE_WET_AROMA'),
        this.translate.instant('CUPPING_SCORE_BRIGHTNESS'),
        this.translate.instant('CUPPING_SCORE_FLAVOR'),
        this.translate.instant('CUPPING_SCORE_BODY'),
        this.translate.instant('CUPPING_SCORE_FINISH'),
        this.translate.instant('CUPPING_SCORE_SWEETNESS'),
        this.translate.instant('CUPPING_SCORE_CLEAN_CUP'),
        this.translate.instant('CUPPING_SCORE_COMPLEXITY'),
        this.translate.instant('CUPPING_SCORE_UNIFORMITY'),
      ],
      datasets: [
        {
          fillColor: 'rgba(220,220,220,0.5)',
          strokeColor: 'rgba(220,220,220,1)',
          pointColor: 'rgba(220,220,220,1)',
          pointStrokeColor: '#fff',
          data: [
            this.data.cupping.dry_fragrance,
            this.data.cupping.wet_aroma,
            this.data.cupping.brightness,
            this.data.cupping.flavor,
            this.data.cupping.body,
            this.data.cupping.finish,
            this.data.cupping.sweetness,
            this.data.cupping.clean_cup,
            this.data.cupping.complexity,
            this.data.cupping.uniformity
          ]
        }]
    };
    const chartOptions = {
      responsive: true,
      legend: false,
      title: {
        display: false,
        text: '',
      },

      scale: {
        ticks: {
          beginAtZero: true,
          max: 10,
          min: 0,
          step: 0.1
        }
      },
      tooltips: {
        // Disable the on-canvas tooltip
        enabled: false,
      },
      maintainAspectRatio: true,
      aspectRatio: 1,
    };
    const chartObj = new Chart(this.cuppingChart.nativeElement, {
      type: 'radar',
      data: cuppingData,
      options: chartOptions
    });
  }

}
