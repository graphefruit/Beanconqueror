/**Core**/
import {Component, ViewChild} from '@angular/core';
/**Ionic**/
import {ViewController, NavParams, Slides} from 'ionic-angular';
/**Services**/
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
import {UIHelper} from '../../../services/uiHelper';
import {UIImage} from '../../../services/uiImage';

/**Classes**/
import {Brew} from '../../../classes/brew/brew';
import {Settings} from '../../../classes/settings/settings';

/**Interfaces**/
import {IPreparation} from '../../../interfaces/preparation/iPreparation';
import {IBean} from '../../../interfaces/bean/iBean';
import {IBrew} from '../../../interfaces/brew/iBrew';


@Component({
  selector: 'brews-details',
  templateUrl: 'brews-details.html',
})
export class BrewsDetailsModal {

  @ViewChild('photoSlides') photoSlides: Slides;
  public data: Brew = new Brew();

  private brew: IBrew;


  method_of_preparations: Array<IPreparation> = [];
  beans: Array<IBean> = [];

  public settings:Settings;


  constructor(private viewCtrl: ViewController, private navParams: NavParams, private uiBeanStorage: UIBeanStorage,
              private uiPreparationStorage: UIPreparationStorage,
              public uiHelper: UIHelper, private uiImage: UIImage, private uiSettingsStorage:UISettingsStorage) {
    this.settings = this.uiSettingsStorage.getSettings();
    //Moved from ionViewDidEnter, because of Ionic issues with ion-range
    this.brew = this.navParams.get('BREW');
    let copy: IBrew = this.uiHelper.copyData(this.brew);
    this.data.initializeByObject(copy);
    this.method_of_preparations = this.uiPreparationStorage.getAllEntries();
    this.beans = this.uiBeanStorage.getAllEntries();
  }




  dismiss() {
    this.viewCtrl.dismiss("", null, {animate: false});
  }


}
