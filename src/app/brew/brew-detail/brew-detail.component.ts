import {Component, OnInit, ViewChild} from '@angular/core';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {IonSlides, ModalController, NavParams} from '@ionic/angular';
import {UIHelper} from '../../../services/uiHelper';
import {Brew} from '../../../classes/brew/brew';
import {IBrew} from '../../../interfaces/brew/iBrew';
import {Settings} from '../../../classes/settings/settings';
import {Preparation} from '../../../classes/preparation/preparation';
import {PREPARATION_STYLE_TYPE} from '../../../enums/preparations/preparationStyleTypes';

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
               private readonly uiSettingsStorage: UISettingsStorage) {

    this.settings = this.uiSettingsStorage.getSettings();
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range


  }

  public ionViewWillEnter() {
    this.brew = this.navParams.get('brew');
    if (this.brew) {
      const copy: IBrew = this.uiHelper.copyData(this.brew);
      this.data.initializeByObject(copy);
    }
  }

  public showSectionAfterBrew(): boolean {
    return (this.settings.brew_quantity ||
      this.settings.coffee_type ||
      this.settings.coffee_concentration ||
      this.settings.rating ||
      this.settings.note ||
      this.settings.set_custom_brew_time ||
      this.settings.attachments ||
      this.settings.tds ||
      this.settings.brew_beverage_quantity);
  }
  public getPreparation(): Preparation {
    return this.data.getPreparation();
  }

  public showSectionWhileBrew(): boolean {
    return (this.settings.pressure_profile ||
      this.settings.brew_temperature_time ||
      this.settings.brew_time ||
      this.settings.coffee_blooming_time ||
      this.settings.coffee_first_drip_time);
  }

  public showSectionBeforeBrew(): boolean {
    return (this.settings.grind_size ||
      this.settings.grind_weight ||
      this.settings.brew_temperature ||
      this.settings.method_of_preparation ||
      this.settings.bean_type ||
      this.settings.mill ||
      this.settings.mill_speed ||
      this.settings.mill_timer);

  }

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,'brew-detail');
  }

  public ngOnInit() {}

}
