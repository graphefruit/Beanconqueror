import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {AlertController, ModalController, Platform, PopoverController} from '@ionic/angular';
import {UIAlert} from '../../services/uiAlert';
import {BrewView} from '../../classes/brew/brewView';
import {UIHelper} from '../../services/uiHelper';
import {ISettings} from '../../interfaces/settings/iSettings';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {IBrew} from '../../interfaces/brew/iBrew';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {UIBrewHelper} from '../../services/uiBrewHelper';
import {Brew} from '../../classes/brew/brew';
import {SocialSharing} from '@ionic-native/social-sharing/ngx';
import {BrewAddComponent} from './brew-add/brew-add.component';
import {FileEntry} from '@ionic-native/file';
import {BrewDetailComponent} from './brew-detail/brew-detail.component';
import {BrewPhotoViewComponent} from './brew-photo-view/brew-photo-view.component';
import {BrewEditComponent} from './brew-edit/brew-edit.component';
import {BrewTextComponent} from './brew-text/brew-text.component';
import {BrewPopoverComponent} from './brew-popover/brew-popover.component';
import {BrewTableComponent} from './brew-table/brew-table.component';

@Component({
  selector: 'brew',
  templateUrl: './brew.page.html',
  styleUrls: ['./brew.page.scss'],
})
export class BrewPage implements OnInit {


  public brews: Array<Brew>;
  public openBrewsView: Array<BrewView> = [];
  public archiveBrewsView: Array<BrewView> = [];
  public brew_segment: string = 'open';
  public settings: ISettings;
  public query: string = '';

  constructor (private readonly modalCtrl: ModalController,
               private readonly platform: Platform,
               private readonly socialSharing: SocialSharing,
               private readonly uiBrewStorage: UIBrewStorage,
               private readonly changeDetectorRef: ChangeDetectorRef,
               private readonly uiAlert: UIAlert,
               public uiHelper: UIHelper,
               public uiBrewHelper: UIBrewHelper,
               private readonly uiSettingsStorage: UISettingsStorage,
               private readonly popoverCtrl: PopoverController,
               public alertCtrl: AlertController) {
    this.settings = this.uiSettingsStorage.getSettings();

  }

  public ionViewWillEnter(): void {
    this.loadBrews();
    // If we don't have beans, we cant do a brew from now on, because of roasting degree and the age of beans.
  }

  public async editBrew(_brew: IBrew) {
    // const editBrewModal = this.modalCtrl.create(BrewsEditModal, {BREW: _brew});
    // editBrewModal.onDidDismiss(() => {
    //   this.loadBrews();
    // });
    // editBrewModal.present({animate: false});
    const modal = await this.modalCtrl.create({component:BrewEditComponent, componentProps: {'brew' : _brew}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBrews();
  }

  public async detailBrew(_brew: IBrew) {
    // const editBrewModal = this.modalCtrl.create(BrewsDetailsModal, {BREW: _brew});
    // editBrewModal.onDidDismiss(() => {
    //   this.loadBrews();
    // });
    // editBrewModal.present({animate: false});
    const modal = await this.modalCtrl.create({component:BrewDetailComponent, componentProps: {'brew' : _brew}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBrews();
  }

  public async viewPhotos(_brew: IBrew) {
    // const brewsPhotoViewModal = this.modalCtrl.create(BrewsPhotoView, {BREW: _brew});
    // brewsPhotoViewModal.present({animate: false});
    const modal = await this.modalCtrl.create({component:BrewPhotoViewComponent, componentProps: {'brew' : _brew}});
    await modal.present();
    await modal.onWillDismiss();
  }

  public deleteBrew(_brew: IBrew): void {
    this.uiAlert.showConfirm('Brühung löschen?', 'Sicher?').then(() => {
          // Yes
          this.__deleteBrew(_brew);
        },
        () => {
          // No
        });

  }

  public async postBrew(_brew: IBrew) {
    //const textBrewsModal = this.modalCtrl.create(BrewsTextModal, {BREW: _brew});
    //textBrewsModal.present({animate: false});
    const modal = await this.modalCtrl.create({component:BrewTextComponent, componentProps: {'brew' : _brew}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBrews();
  }

  public async showMore(event) {
    const popover = await this.popoverCtrl.create({
      component: BrewPopoverComponent,
      event: event,
      translucent: true
    });
    await popover.present();
    const data  =   await popover.onWillDismiss();
    if (data.role === BrewPopoverComponent.ACTIONS.DOWNLOAD)
    {
      this.downloadCSV();
    } else if (data.role === BrewPopoverComponent.ACTIONS.TABLE) {
      const tableModal = await this.modalCtrl.create({component:BrewTableComponent});
      await tableModal.present();
    }

  }

  public async repeatBrew(_brew: Brew) {
    // const repeatBrewModel = this.modalCtrl.create(BrewsAddModal, {brew_template: brew});
    // repeatBrewModel.onDidDismiss(() => {
    //   this.loadBrews();
    // });
    // repeatBrewModel.present({animate: false});
    const modal = await this.modalCtrl.create({component:BrewAddComponent, componentProps: {'brew_template' : _brew}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBrews();
  }

  public async add() {
    const modal = await this.modalCtrl.create({component:BrewAddComponent});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBrews();
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
          if (result.search(/("|,|\n)/g) >= 0) {
            result = `"${result}"`;
          }

          if (j > 0) {
            finalVal += ',';
          }
          finalVal += result;
        }

        return finalVal + '\n';
      };

      let csvFile = '';
      for (const i of  rows) {
        csvFile += processRow(i);
      }

      this.uiHelper.exportCSV(filename, csvFile).then(async (_savedFile: FileEntry) => {
        if (this.platform.is('android')) {
          const alert = await this.alertCtrl.create({
            header: 'Heruntergeladen!',
            subHeader: `CSV-Datei '${_savedFile.name}' wurde erfolgreich in den Download-Ordner heruntergeladen!`,
            buttons: ['OK']
          });
          await alert.present();
        } else {
          this.socialSharing.share(undefined, undefined, _savedFile.nativeURL);

        }

      }, async () => {
        // No export possible.
        const alert = await this.alertCtrl.create({
          header: 'Fehler aufgetreten!',
          subHeader: 'CSV-Datei kann leider nicht heruntergeladen werden!',
          buttons: ['OK']
        });
        await alert.present();
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
      if (!headersSet) {
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
    const currentDateTimeString = `${now.getMonth()}-${now.getDate()}-${now.getFullYear()}-
    ${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;

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

  private __sortBrews(_sortingBrews: Array<Brew>): Array<IBrew> {
    const sortedBrews: Array<IBrew> = _sortingBrews.sort((obj1, obj2) => {
      if (obj1.config.unix_timestamp < obj2.config.unix_timestamp) {
        return 1;
      }
      if (obj1.config.unix_timestamp > obj2.config.unix_timestamp) {
        return -1;
      }

      return 0;
    });
    return sortedBrews;
  }

  private __initializeBrewView(_type: string): void {
// sort latest to top.
    const brewsCopy: Array<Brew> = [...this.brews];
    let brewsFilteres: Array<Brew>;
    brewsFilteres = brewsCopy.filter((e) => e.getBean().finished === !(_type === 'open'));
    const sortedBrews: Array<IBrew> = this.__sortBrews(brewsFilteres);

    const collection = {};
    // Create collection
    for (const forBrew of sortedBrews) {
      const day: string = this.uiHelper.formateDate(forBrew.config.unix_timestamp, 'dddd - DD.MM.YYYY');
      if (collection[day] === undefined) {
        collection[day] = {
          BREWS: []
        };
      }
      collection[day].BREWS.push(forBrew);
    }

    for (const key in collection) {
      if (collection.hasOwnProperty(key)) {
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

  public ngOnInit() {
  }

}
