import {Component, OnInit, ViewChild} from '@angular/core';
import {ModalController, NavParams} from '@ionic/angular';
import {Brew} from '../../../classes/brew/brew';
import {Settings} from '../../../classes/settings/settings';
import {IBrew} from '../../../interfaces/brew/iBrew';
import {UIHelper} from '../../../services/uiHelper';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';

import {UIToast} from '../../../services/uiToast';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {CuppingRadarComponent} from '../../../components/cupping-radar/cupping-radar.component';
import {BrewFlavorPickerComponent} from '../brew-flavor-picker/brew-flavor-picker.component';
import BREW_TRACKING from '../../../data/tracking/brewTracking';
import {UIAnalytics} from '../../../services/uiAnalytics';

@Component({
  selector: 'brew-cupping',
  templateUrl: './brew-cupping.component.html',
  styleUrls: ['./brew-cupping.component.scss'],
})
export class BrewCuppingComponent implements OnInit {
  public static COMPONENT_ID = 'brew-cup';
  public segment:string ='flavor';

  public data: Brew = new Brew();
  public settings: Settings;

  @ViewChild('radar', {static: false}) public radar: CuppingRadarComponent;
  private brew: IBrew;

  constructor(private readonly modalController: ModalController,
              private readonly navParams: NavParams,
              public uiHelper: UIHelper,
              private readonly uiSettingsStorage: UISettingsStorage,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiToast: UIToast,
              private readonly uiAnalytics: UIAnalytics) {

    this.settings = this.uiSettingsStorage.getSettings();

    // Moved from ionViewDidEnter, because of Ionic issues with ion-range

  }

  public segmentChanged() {
    // Timeout else the viewchilds are not ready.
    setTimeout( () => {
      if (this.segment === 'cupping') {
        this.loadCupping();
      } else {

      }
    },50);

  }
  public saveCuppingValues() {
    this.data.cupping = this.radar.getCuppingValues();
  }

  public loadCupping() {
    this.radar.setCuppingValues(this.data.cupping);
  }

  public deleteCustomFlavor(_index) {
    this.data.cupped_flavor.custom_flavors.splice(_index, 1);
  }
  public deletePredefinedFlavor(_key) {

    delete this.data.cupped_flavor.predefined_flavors[_key];

  }

  public async tasteFlavors() {
      const modal = await this.modalController.create({component: BrewFlavorPickerComponent,
        id: BrewFlavorPickerComponent.COMPONENT_ID,
        componentProps: {flavor: this.data.cupped_flavor}});
      await modal.present();
      const {data} = await modal.onWillDismiss();
      if (data !== undefined && data.hasOwnProperty('customFlavors')) {
        this.data.cupped_flavor.custom_flavors = data.customFlavors;
        this.data.cupped_flavor.predefined_flavors = data.selectedFlavors;

      }
  }


  public ionViewWillEnter() {
    this.uiAnalytics.trackEvent(BREW_TRACKING.TITLE, BREW_TRACKING.ACTIONS.CUPPING);
    this.brew = this.navParams.get('brew');
    if (this.brew) {
      const copy: IBrew = this.uiHelper.cloneData(this.uiBrewStorage.getByUUID(this.brew.config.uuid));
      this.data.initializeByObject(copy);
    }
  }

  public ngOnInit(): void {
  }

  public async updateBrew() {


    await this.uiBrewStorage.update(this.data);
    this.uiToast.showInfoToast('TOAST_BREW_EDITED_SUCCESSFULLY');
    this.dismiss();
  }

  public async dismiss() {
    this.modalController.dismiss({
      dismissed: true
    },undefined,BrewCuppingComponent.COMPONENT_ID);


  }
}
