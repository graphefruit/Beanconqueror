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


  private brew: IBrew;
  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               public uiHelper: UIHelper,
               private readonly uiSettingsStorage: UISettingsStorage,
               private readonly uiAnalytics: UIAnalytics) {

    this.settings = this.uiSettingsStorage.getSettings();
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range


  }

  public ionViewWillEnter() {
    this.uiAnalytics.trackEvent('BREW', 'DETAIL');
    this.brew = this.navParams.get('brew');
    if (this.brew) {
      const copy: IBrew = this.uiHelper.copyData(this.brew);
      this.data.initializeByObject(copy);
    }
  }


  public getPreparation(): Preparation {
    return this.data.getPreparation();
  }
  public showSectionAfterBrew(): boolean {
    let checkData: Settings | Preparation;
    if (this.getPreparation().use_custom_parameters === true) {
      checkData = this.getPreparation();
    } else {
      checkData = this.settings;
    }
    return (checkData.manage_parameters.brew_quantity ||
      checkData.manage_parameters.coffee_type ||
      checkData.manage_parameters.coffee_concentration ||
      checkData.manage_parameters.rating ||
      checkData.manage_parameters.note ||
      checkData.manage_parameters.set_custom_brew_time ||
      checkData.manage_parameters.attachments ||
      checkData.manage_parameters.tds ||
      checkData.manage_parameters.brew_beverage_quantity);
  }


  public showSectionWhileBrew(): boolean {
    let checkData: Settings | Preparation;
    if (this.getPreparation().use_custom_parameters === true) {
      checkData = this.getPreparation();
    } else {
      checkData = this.settings;
    }
    return (checkData.manage_parameters.pressure_profile ||
      checkData.manage_parameters.brew_temperature_time ||
      checkData.manage_parameters.brew_time ||
      checkData.manage_parameters.coffee_blooming_time ||
      checkData.manage_parameters.coffee_first_drip_time);
  }

  public showSectionBeforeBrew(): boolean {
    let checkData: Settings | Preparation;
    if (this.getPreparation().use_custom_parameters === true) {
      checkData = this.getPreparation();
    } else {
      checkData = this.settings;
    }
    return (checkData.manage_parameters.grind_size ||
      checkData.manage_parameters.grind_weight ||
      checkData.manage_parameters.brew_temperature ||
      checkData.manage_parameters.method_of_preparation ||
      checkData.manage_parameters.bean_type ||
      checkData.manage_parameters.mill ||
      checkData.manage_parameters.mill_speed ||
      checkData.manage_parameters.mill_timer);

  }

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,'brew-detail');
  }

  public ngOnInit() {}

}
