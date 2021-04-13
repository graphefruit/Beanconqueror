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
               private readonly uiBrewHelper: UIBrewHelper) {

    this.settings = this.uiSettingsStorage.getSettings();
  }

  public ionViewWillEnter() {
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

  private showCupping(): boolean {
    return this.uiBrewHelper.showCupping(this.data);
  }

  private __loadCuppingChart(): void {
    const chartObj = new Chart(this.cuppingChart.nativeElement, this.uiBrewHelper.getCuppingChartData(this.data));
  }

}
