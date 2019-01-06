/**Core**/
import {Component, ChangeDetectorRef} from '@angular/core';
import {PopoverController, NavParams, Platform,ModalController, AlertController} from 'ionic-angular';


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
import {BrewsTableModal} from "./table/brews-table";
import {FileEntry} from "@ionic-native/file";
import {SocialSharing} from "@ionic-native/social-sharing";
import {UIMillStorage} from "../../services/uiMillStorage";
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
  public hasMills: boolean = false;

  constructor(private modalCtrl: ModalController,
              private platform: Platform,
              private socialSharing: SocialSharing,
              private uiBrewStorage: UIBrewStorage,
              private changeDetectorRef: ChangeDetectorRef, private uiAlert: UIAlert,
              private uiBeanStorage: UIBeanStorage, private uiPreparationStorage: UIPreparationStorage,
              private uiHelper: UIHelper, private uiSettingsStorage: UISettingsStorage,
              private popoverCtrl: PopoverController, public alertCtrl: AlertController,
              private uiMillStorage:UIMillStorage) {
    this.settings = this.uiSettingsStorage.getSettings();


  }


  ionViewWillEnter() {
    this.loadBrews();
    //If we don't have beans, we cant do a brew from now on, because of roasting degree and the age of beans.
    this.hasBeans = (this.uiBeanStorage.getAllEntries().length > 0);
    this.hasPreparationMethods = (this.uiPreparationStorage.getAllEntries().length > 0);
    this.hasMills = (this.uiMillStorage.getAllEntries().length > 0);
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

    var exportToCsv = (filename, rows) => {
      var processRow = (row) => {
        var finalVal = '';
        for (var j = 0; j < row.length; j++) {
          var innerValue = row[j] === null ? '' : row[j].toString();
          if (row[j] instanceof Date) {
            innerValue = row[j].toLocaleString();
          }

          var result = innerValue.replace(/"/g, '""');
          if (result.search(/("|,|\n)/g) >= 0)
            result = '"' + result + '"';
          if (j > 0)
            finalVal += ',';
          finalVal += result;
        }
        return finalVal + '\n';
      };

      var csvFile = '';
      for (var i = 0; i < rows.length; i++) {
        csvFile += processRow(rows[i]);
      }

      this.uiHelper.exportCSV(filename, csvFile).then((_savedFile:FileEntry) => {
        if (this.platform.is("android"))
        {
          let alert = this.alertCtrl.create({
            title: 'Heruntergeladen!',
            subTitle: `CSV-Datei '${_savedFile.name}' wurde erfolgreich in den Download-Ordner heruntergeladen!`,
            buttons: ['OK']
          });
          alert.present();
        }
        else
        {
          this.socialSharing.share(null,null,_savedFile.nativeURL);

        }

      });

    };


    let entries: Array<Array<{ VALUE: any, LABEL: string }>> = [];
    for (var i = 0; i < this.brews.length; i++) {
      let brew: Brew = this.brews[i];

      let entry: Array<{ VALUE: any, LABEL: string }> = [
        {"VALUE": this.uiHelper.formateDate(brew.config.unix_timestamp, "DD.MM.YYYY HH:mm"), "LABEL":"Tag"},
        {"VALUE": brew.grind_size, "LABEL": "Mahlgrad"},
        {"VALUE": brew.grind_weight, "LABEL": "Output: Gewicht/Menge"},
        {"VALUE": brew.getPreparation().name, "LABEL": "Zubereitungsmethode"},
        {"VALUE": brew.getBean().name, "LABEL": "Bohne"},
        {"VALUE": brew.brew_temperature, "LABEL": "Brühtemperatur"},
        {"VALUE": brew.brew_temperature_time, "LABEL": "Temperatur Zeit"},
        {"VALUE": brew.brew_time, "LABEL": "Brühzeit"},
        {"VALUE": brew.brew_quantity, "LABEL": "Bezugsmenge"},
        {"VALUE": brew.getBrewQuantityTypeName(), "LABEL": "Bezugsmenge-Typ"},
        {"VALUE": brew.note, "LABEL": "Notizen"},
        {"VALUE": brew.rating, "LABEL": "Bewertung"},
        {"VALUE": brew.coffee_type, "LABEL": "Kaffeetyp"},
        {"VALUE": brew.coffee_concentration, "LABEL": "Kaffee-Konzentration"},
        {"VALUE": brew.coffee_first_drip_time, "LABEL": "Erster Kaffeetropfen"},
        {"VALUE": brew.coffee_blooming_time, "LABEL": "Blooming-Zeit / Preinfusion"},
        {"VALUE": brew.getCalculatedBeanAge(), "LABEL": "Bohnenalter"},
        {"VALUE": brew.getBrewRatio(), "LABEL": "Brührate"},
      ];
      entries.push(entry);
    }

    //create CSV header labels
    let exportData: Array<Array<{ VALUE: any, LABEL: string }>> = [];

    let headersSet: boolean = false;
    for (let i = 0; i < entries.length; i++) {
      let entry: Array<{ VALUE: any, LABEL: string }> = entries[i];

      let addValues: Array<any> = [];
      if (headersSet == false) {
        for (let z = 0; z < entry.length; z++) {
          addValues.push(entry[z].LABEL);
        }
        headersSet = true;
        exportData.push(addValues);
      }
      addValues = [];
      for (let z = 0; z < entry.length; z++) {
        addValues.push(entry[z].VALUE);
      }

      exportData.push(addValues);
    }

    var now = new Date();
    var currentDateTimeString = now.getMonth() + 1 + '-' + now.getDate() + '-' + now.getFullYear() + '-' + now.getHours() + now.getMinutes() + now.getSeconds();

//generate file
    exportToCsv('Beanconqueror-' + currentDateTimeString + '.csv', exportData);

  }

  public showMore(event) {
    let popover = this.popoverCtrl.create(BrewsPopover, {});
    popover.onDidDismiss(data => {
      if (data == BrewsPopover.ACTIONS.DOWNLOAD) {
        this.downloadCSV();

      }
      else if (data == BrewsPopover.ACTIONS.TABLE){
        let tableModal = this.modalCtrl.create(BrewsTableModal, {});
        tableModal.onDidDismiss(() => {

        });
        tableModal.present({animate: false});
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
