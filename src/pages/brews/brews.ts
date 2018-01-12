/**Core**/
import {Component, ChangeDetectorRef} from '@angular/core';
import {PopoverController, NavParams} from 'ionic-angular';
/**Ionic**/
import {ModalController} from 'ionic-angular';

/**Services**/
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {UIBeanStorage} from '../../services/uiBeanStorage';
import {UIPreparationStorage} from '../../services/uiPreparationStorage';
import {UIAlert} from '../../services/uiAlert';
import {UIHelper} from '../../services/uiHelper';
import {UISettingsStorage} from '../../services/uiSettingsStorage';

/**Interfaces**/
import {IBrew} from '../../interfaces/brew/iBrew';
import {ISettings} from '../../interfaces/settings/iSettings';
/**Classes**/
import {Brew} from '../../classes/brew/brew';
import {BrewView} from '../../classes/brew/brewView';


import {BrewsPopover} from '../brews/popover/brews-popover';

/**Modals**/
import {BrewsAddModal} from '../brews/add/brews-add';
import {BrewsEditModal} from '../brews/edit/brews-edit';
import {BrewsDetailsModal} from '../brews/details/brews-details';

import {BrewsPhotoView} from '../brews/photo-view/brews-photo-view';
@Component({
  templateUrl: 'brews.html',
  selector: 'brews'
})
export class BrewsPage {

  public brews: Array<Brew>;
  public brewsView: Array<BrewView> = [];

  public settings: ISettings;

  public hasBeans: boolean = false;
  public hasPreparationMethods: boolean = false;

  constructor(private modalCtrl: ModalController, private uiBrewStorage: UIBrewStorage,
              private changeDetectorRef: ChangeDetectorRef, private uiAlert: UIAlert,
              private uiBeanStorage: UIBeanStorage, private uiPreparationStorage: UIPreparationStorage,
              private uiHelper: UIHelper, private uiSettingsStorage: UISettingsStorage, private popoverCtrl: PopoverController) {
    this.settings = this.uiSettingsStorage.getSettings();


  }


  ionViewWillEnter() {
    this.loadBrews();
    //If we don't have beans, we cant do a brew from now on, because of roasting degree and the age of beans.
    this.hasBeans = (this.uiBeanStorage.getAllEntries().length > 0);
    this.hasPreparationMethods = (this.uiPreparationStorage.getAllEntries().length > 0);
  }

  public editBrew(_brew: IBrew) {
    let editBrewModal = this.modalCtrl.create(BrewsEditModal, {'BREW': _brew});
    editBrewModal.onDidDismiss(() => {
      this.loadBrews();
    });
    editBrewModal.present({animate: false});
  }

  public detailBrew(_brew: IBrew) {
    let editBrewModal = this.modalCtrl.create(BrewsDetailsModal, {'BREW': _brew});
    editBrewModal.onDidDismiss(() => {
      this.loadBrews();
    });
    editBrewModal.present({animate: false});
  }

  public viewPhotos(_brew: IBrew) {
    let brewsPhotoViewModal = this.modalCtrl.create(BrewsPhotoView, {'BREW': _brew});
    brewsPhotoViewModal.onDidDismiss(() => {

    });
    brewsPhotoViewModal.present({animate: false});
  }


  public deleteBrew(_brew: IBrew) {
    this.uiAlert.showConfirm("Brühung löschen?", "Sicher?").then(() => {
        //Yes
        this.__deleteBrew(_brew)
      },
      () => {
        //No
      });

  }

  private __deleteBrew(_brew: IBrew) {
    this.uiBrewStorage.removeByObject(_brew);
    this.loadBrews();

  }

  private downloadCSV() {

  }

  public showMore(event) {
    let popover = this.popoverCtrl.create(BrewsPopover, {});
    popover.onDidDismiss(data => {
      if (data == BrewsPopover.ACTIONS.DOWNLOAD) {
        this.downloadCSV();
      }
    });

    popover.present({
      ev: event
    });
  }

  public addBrew() {
    let addBrewsModal = this.modalCtrl.create(BrewsAddModal, {});
    addBrewsModal.onDidDismiss(() => {
      this.loadBrews();
    });
    addBrewsModal.present({animate: false});
  }


  private __initializeBrews() {
    this.brews = this.uiBrewStorage.getAllEntries();
    this.brewsView = [];

    //sort latest to top.
    let sortedBrews: Array<IBrew> = this.brews.sort((obj1, obj2) => {
      if (obj1.config.unix_timestamp < obj2.config.unix_timestamp) {
        return 1;
      }
      if (obj1.config.unix_timestamp > obj2.config.unix_timestamp) {
        return -1;
      }
      return 0;
    });

    let collection = {};
    //Create collection
    for (let i = 0; i < sortedBrews.length; i++) {
      let day: string = this.uiHelper.formateDate(sortedBrews[i].config.unix_timestamp, "dddd - DD.MM.YYYY");
      if (collection[day] === undefined) {
        collection[day] = {
          "BREWS": []
        }
      }
      collection[day]["BREWS"].push(sortedBrews[i]);
    }

    for (let key in collection) {
      let viewObj: BrewView = new BrewView();
      viewObj.title = key;
      viewObj.brews = collection[key].BREWS;
      this.brewsView.push(viewObj);
    }
  }

  public loadBrews() {
    this.__initializeBrews();
    this.changeDetectorRef.detectChanges();
  }
}
