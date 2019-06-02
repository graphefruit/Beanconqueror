/** Core */
import { Component, ViewChild } from '@angular/core';
/** Ionic */
import { NavParams, Slides, ViewController } from 'ionic-angular';
import { UIHelper } from '../../../services/uiHelper';
/** Services */
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

/** Classes */
import { Brew } from '../../../classes/brew/brew';
import { Settings } from '../../../classes/settings/settings';

/** Interfaces */

import { IBrew } from '../../../interfaces/brew/iBrew';

@Component({
  selector: 'brews-details',
  templateUrl: 'brews-details.html'
})
export class BrewsDetailsModal {

  @ViewChild('photoSlides') public photoSlides: Slides;
  public data: Brew = new Brew();
  public settings: Settings;

  private brew: IBrew;

  constructor(private viewCtrl: ViewController,
              private navParams: NavParams,
              public uiHelper: UIHelper,
              private uiSettingsStorage: UISettingsStorage) {

    this.settings = this.uiSettingsStorage.getSettings();
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    this.brew = this.navParams.get('BREW');
    const copy: IBrew = this.uiHelper.copyData(this.brew);
    this.data.initializeByObject(copy);

  }

  public dismiss(): void {
    this.viewCtrl.dismiss('', undefined, {animate: false});
  }

}
