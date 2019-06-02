/** Core */
import {Component, ViewChild} from '@angular/core';
/** Ionic */
import {ViewController, NavParams, Slides} from 'ionic-angular';
/** Services */
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {UIHelper} from '../../../services/uiHelper';

/** Classes */
import {Brew} from '../../../classes/brew/brew';
import {Settings} from '../../../classes/settings/settings';

/** Interfaces */

import {IBrew} from '../../../interfaces/brew/iBrew';



@Component({
  selector: 'brews-details',
  templateUrl: 'brews-details.html',
})
export class BrewsDetailsModal {

  @ViewChild('photoSlides') photoSlides: Slides;
  public data: Brew = new Brew();

  private brew: IBrew;
  public settings:Settings;


  constructor(private viewCtrl: ViewController,
              private navParams: NavParams,
              public uiHelper: UIHelper,
              private uiSettingsStorage:UISettingsStorage) {

    this.settings = this.uiSettingsStorage.getSettings();
    //Moved from ionViewDidEnter, because of Ionic issues with ion-range
    this.brew = this.navParams.get('BREW');
    let copy: IBrew = this.uiHelper.copyData(this.brew);
    this.data.initializeByObject(copy);

  }




  dismiss() {
    this.viewCtrl.dismiss("", null, {animate: false});
  }


}
