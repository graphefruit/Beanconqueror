/** Core */
import { ChangeDetectorRef, Component } from '@angular/core';
import { AlertController, ModalController, Platform, PopoverController } from 'ionic-angular';

/** Services */
import { UIAlert } from '../../services/uiAlert';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIHelper } from '../../services/uiHelper';
import { UISettingsStorage } from '../../services/uiSettingsStorage';

/** Interfaces */
/** Classes */
import { Brew } from '../../classes/brew/brew';
import { BrewView } from '../../classes/brew/brewView';
import { IBrew } from '../../interfaces/brew/iBrew';
import { ISettings } from '../../interfaces/settings/iSettings';

import { BrewsPopover } from '../brews/popover/brews-popover';

/** Modals */
import { BrewsAddModal } from '../brews/add/brews-add';
import { BrewsDetailsModal } from '../brews/details/brews-details';
import { BrewsEditModal } from '../brews/edit/brews-edit';

import { FileEntry } from '@ionic-native/file';
import { SocialSharing } from '@ionic-native/social-sharing';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import { BrewsPhotoView } from '../brews/photo-view/brews-photo-view';
import { BrewsTableModal } from './table/brews-table';
import { BrewsTextModal } from './text/brews-text';
@Component({
  templateUrl: 'brews.html',
  selector: 'brews'
})
export class BrewsPage {

  public brews: Array<Brew>;
  public openBrewsView: Array<BrewView> = [];
  public archiveBrewsView: Array<BrewView> = [];
  public brew_segment: string = 'open';
  public settings: ISettings;

  constructor(private modalCtrl: ModalController,
              private platform: Platform,
              private socialSharing: SocialSharing,
              private uiBrewStorage: UIBrewStorage,
              private changeDetectorRef: ChangeDetectorRef, private uiAlert: UIAlert,
              public uiHelper: UIHelper,
              public uiBrewHelper: UIBrewHelper,
              private uiSettingsStorage: UISettingsStorage,
              private popoverCtrl: PopoverController, public alertCtrl: AlertController) {
    this.settings = this.uiSettingsStorage.getSettings();

  }

  public ionViewWillEnter(): void {
    this.loadBrews();
    // If we don't have beans, we cant do a brew from now on, because of roasting degree and the age of beans.
  }

  public editBrew(_brew: IBrew): void {
    const editBrewModal = this.modalCtrl.create(BrewsEditModal, {BREW: _brew});
    editBrewModal.onDidDismiss(() => {
      this.loadBrews();
    });
    editBrewModal.present({animate: false});
  }

  public detailBrew(_brew: IBrew): void {
    const editBrewModal = this.modalCtrl.create(BrewsDetailsModal, {BREW: _brew});
    editBrewModal.onDidDismiss(() => {
      this.loadBrews();
    });
    editBrewModal.present({animate: false});
  }

  public viewPhotos(_brew: IBrew): void {
    const brewsPhotoViewModal = this.modalCtrl.create(BrewsPhotoView, {BREW: _brew});
    brewsPhotoViewModal.present({animate: false});
  }

  public deleteBrew(_brew: IBrew): void {
    this.uiAlert.showConfirm('Brühung löschen?', 'Sicher?').
    then(() => {
        // Yes
        this.__deleteBrew(_brew);
      },
      () => {
        // No
      });

  }
  public postBrew(_brew: IBrew): void {
    const textBrewsModal = this.modalCtrl.create(BrewsTextModal, {BREW: _brew});
    textBrewsModal.present({animate: false});
  }

  public showMore(event): void {
    const popover = this.popoverCtrl.create(BrewsPopover, {});
    popover.onDidDismiss((data) => {
      if (data === BrewsPopover.ACTIONS.DOWNLOAD) {
        this.downloadCSV();

      } else if (data === BrewsPopover.ACTIONS.TABLE) {
        const tableModal = this.modalCtrl.create(BrewsTableModal, {});
        tableModal.present({animate: false});
      }
    });

    popover.present({
      ev: event
    });
  }

  public addBrew(): void {
    const addBrewsModal = this.modalCtrl.create(BrewsAddModal, {});
    addBrewsModal.onDidDismiss(() => {
      this.loadBrews();
    });
    addBrewsModal.present({animate: false});
  }

  public loadBrews(): void {
    this.__initializeBrews();
    this.changeDetectorRef.detectChanges();
  }

  private __deleteBrew(_brew: IBrew): void {
    this.uiBrewStorage.removeByObject(_brew);
    this.loadBrews();

  }

  private downloadCSV(): void {

    const exportToCsv = (filename, rows) => {
      const processRow = (row) => {
        let finalVal = '';
        for (let j = 0; j < row.length; j++) {
          let innerValue = row[j] === null ? '' : row[j].toString();
          if (row[j] instanceof Date) {
            innerValue = row[j].toLocaleString();
          }

          let result = innerValue.replace(/"/g, '""');
          if (result.search(/("|,|\n)/g) >= 0)
            result = '"' + result + '"';
          if (j > 0)
            finalVal += ',';
          finalVal += result;
        }
        return finalVal + '\n';
      };

      let csvFile = '';
      for (const i of  rows) {
        csvFile += processRow(i);
      }

      this.uiHelper.exportCSV(filename, csvFile).then((_savedFile: FileEntry) => {
        if (this.platform.is('android')) {
          const alert = this.alertCtrl.create({
            title: 'Heruntergeladen!',
            subTitle: `CSV-Datei '${_savedFile.name}' wurde erfolgreich in den Download-Ordner heruntergeladen!`,
            buttons: ['OK']
          });
          alert.present();
        } else {
          this.socialSharing.share(undefined, undefined, _savedFile.nativeURL);

        }

      });

    };

    const entries: Array<Array<{ VALUE: any, LABEL: string }>> = [];
    for (const i of this.brews) {
      const brew: Brew = i;

      const entry: Array<{ VALUE: any, LABEL: string }> = [
        {VALUE: this.uiHelper.formateDate(brew.config.unix_timestamp, 'DD.MM.YYYY HH:mm'), LABEL: 'Tag'},
        {VALUE: brew.grind_size, LABEL: 'Mahlgrad'},
        {VALUE: brew.grind_weight, LABEL: 'Output: Gewicht/Menge'},
        {VALUE: brew.getPreparation().name, LABEL: 'Zubereitungsmethode'},
        {VALUE: brew.getBean().name, LABEL: 'Bohne'},
        {VALUE: brew.getBean().roaster, LABEL: 'Röster'},
        {VALUE: brew.brew_temperature, LABEL: 'Brühtemperatur'},
        {VALUE: brew.brew_temperature_time, LABEL: 'Temperatur Zeit'},
        {VALUE: brew.brew_time, LABEL: 'Brühzeit'},
        {VALUE: brew.pressure_profile, LABEL: 'Druckprofil'},
        {VALUE: brew.mill_speed, LABEL: 'Mühlengeschwindigkeit'},
        {VALUE: brew.getMill().name, LABEL: 'Mühle'},
        {VALUE: brew.brew_quantity, LABEL: 'Bezugsmenge'},
        {VALUE: brew.getBrewQuantityTypeName(), LABEL: 'Bezugsmenge-Typ'},
        {VALUE: brew.note, LABEL: 'Notizen'},
        {VALUE: brew.rating, LABEL: 'Bewertung'},
        {VALUE: brew.coffee_type, LABEL: 'Kaffeetyp'},
        {VALUE: brew.coffee_concentration, LABEL: 'Kaffee-Konzentration'},
        {VALUE: brew.coffee_first_drip_time, LABEL: 'Erster Kaffeetropfen'},
        {VALUE: brew.coffee_blooming_time, LABEL: 'Blooming-Zeit / Preinfusion'},
        {VALUE: brew.getCalculatedBeanAge(), LABEL: 'Bohnenalter'},
        {VALUE: brew.getBrewRatio(), LABEL: 'Brührate'},
        {VALUE: brew.getBean().finished, LABEL: 'Fertig?'}
      ];
      entries.push(entry);
    }

    // create CSV header labels
    const exportData: Array<Array<{ VALUE: any, LABEL: string }>> = [];

    let headersSet: boolean = false;
    for (const i of entries) {
      const entry: Array<{ VALUE: any, LABEL: string }> = i;

      let addValues: Array<any> = [];
      if (headersSet === false) {
        for (const z of entry) {
          addValues.push(z.LABEL);
        }
        headersSet = true;
        exportData.push(addValues);
      }
      addValues = [];
      for (const z of entry) {
        addValues.push(z.VALUE);
      }
      exportData.push(addValues);
    }

    const now = new Date();
    const currentDateTimeString = now.getMonth() + 1 +
     '-' + now.getDate() + '-' + now.getFullYear() + '-' +
      now.getHours() + now.getMinutes() + now.getSeconds();

// generate file
    exportToCsv('Beanconqueror-' + currentDateTimeString + '.csv', exportData);

  }

  private __initializeBrews(): void {
    this.brews = this.uiBrewStorage.getAllEntries();
    this.openBrewsView = [];
    this.archiveBrewsView = [];

    this.__initializeBrewView('open');
    this.__initializeBrewView('archiv');
  }
  private __initializeBrewView(_type: string): void {
// sort latest to top.
    const brewsCopy: Array<Brew> = [...this.brews];
    let brewsFilteres: Array<Brew>;
    brewsFilteres = brewsCopy.filter((e) => e.getBean().finished === !(_type === 'open'));
    const sortedBrews: Array<IBrew> = brewsFilteres.sort((obj1, obj2) => {
      if (obj1.config.unix_timestamp < obj2.config.unix_timestamp) {
        return 1;
      }
      if (obj1.config.unix_timestamp > obj2.config.unix_timestamp) {
        return -1;
      }
      return 0;
    });

    const collection = {};
    // Create collection
    for (let i = 0; i < sortedBrews.length; i++) {
      const day: string = this.uiHelper.formateDate(sortedBrews[i].config.unix_timestamp, 'dddd - DD.MM.YYYY');
      if (collection[day] === undefined) {
        collection[day] = {
          BREWS: []
        };
      }
      collection[day].BREWS.push(sortedBrews[i]);
    }

    for (const key in collection) {
      const viewObj: BrewView = new BrewView();
      viewObj.title = key;
      viewObj.brews = collection[key].BREWS;
      if (_type === 'open') {
        this.openBrewsView.push(viewObj);
      } else {
        this.archiveBrewsView.push(viewObj);
      }

    }
  }
}
