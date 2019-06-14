/** Core */
import {Component, ViewChild} from '@angular/core';
/** Ionic */
import {NavParams, Slides, ViewController} from 'ionic-angular';
import {UIHelper} from '../../../services/uiHelper';
/** Services */
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
/** Classes */
import {Brew} from '../../../classes/brew/brew';
import {Settings} from '../../../classes/settings/settings';
import {IBrew} from '../../../interfaces/brew/iBrew';

/** Interfaces */

@Component({
  selector: 'brews-details',
  templateUrl: 'brews-details.html'
})
export class BrewsDetailsModal {

  @ViewChild('photoSlides') public photoSlides: Slides;
  public data: Brew = new Brew();
  public settings: Settings;

  private readonly brew: IBrew;

  constructor (private readonly viewCtrl: ViewController,
               private readonly navParams: NavParams,
               public uiHelper: UIHelper,
               private readonly uiSettingsStorage: UISettingsStorage) {

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
