import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {AlertController, ModalController, Platform, PopoverController} from '@ionic/angular';
import {UIAlert} from '../../services/uiAlert';
import {UIHelper} from '../../services/uiHelper';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {UIBrewHelper} from '../../services/uiBrewHelper';
import {Brew} from '../../classes/brew/brew';
import {SocialSharing} from '@ionic-native/social-sharing/ngx';
import {BrewAddComponent} from './brew-add/brew-add.component';
import {FileEntry} from '@ionic-native/file';
import {BrewDetailComponent} from './brew-detail/brew-detail.component';
import {BrewPhotoViewComponent} from './brew-photo-view/brew-photo-view.component';
import {BrewEditComponent} from './brew-edit/brew-edit.component';

import {UIPreparationStorage} from '../../services/uiPreparationStorage';
import {UIBeanStorage} from '../../services/uiBeanStorage';
import {UIMillStorage} from '../../services/uiMillStorage';
import {IPreparation} from '../../interfaces/preparation/iPreparation';
import {IBean} from '../../interfaces/bean/iBean';
import {IMill} from '../../interfaces/mill/iMill';
import {IBrewPageFilter} from '../../interfaces/brew/iBrewPageFilter';
import {TranslateService} from '@ngx-translate/core';
import {BREW_ACTION} from '../../enums/brews/brewAction';
import {Bean} from '../../classes/bean/bean';
import {BrewFilterComponent} from './brew-filter/brew-filter.component';
import {Settings} from '../../classes/settings/settings';
import {UIToast} from '../../services/uiToast';

@Component({
  selector: 'brew',
  templateUrl: './brew.page.html',
  styleUrls: ['./brew.page.scss'],
})
export class BrewPage implements OnInit {


  public brews: Array<Brew>;
  public openBrewsView: Array<Brew> = [];
  public archiveBrewsView: Array<Brew> = [];
  public brew_segment: string = 'open';
  public settings: Settings;
  public query: string = '';
  public openBrewsCount: number = 0;
  public archivedBrewsCount: number = 0;

  public customSelectSheetOptions: any = {
    cssClass: 'select-break-text'
  };

  public openBrewsFilter: IBrewPageFilter = {
    mill: [],
    bean: [],
    method_of_preparation: []
  };

  public archivedBrewsFilter: IBrewPageFilter = {
    mill: [],
    bean: [],
    method_of_preparation: []
  };

  public method_of_preparations: Array<IPreparation> = [];
  public beans: Array<IBean> = [];
  public finishedBeans: Array<IBean> = [];
  public mills: Array<IMill> = [];

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
               public alertCtrl: AlertController,
               private readonly uiPreparationStorage: UIPreparationStorage,
               private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiMillStorage: UIMillStorage,
               private translate: TranslateService,
               private readonly uiToast: UIToast) {


  }


  public ionViewWillEnter(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    this.archivedBrewsFilter = this.settings.brew_filter.ARCHIVED;
    this.openBrewsFilter = this.settings.brew_filter.OPEN;
    this.loadBrews();

    // If we don't have beans, we cant do a brew from now on, because of roasting degree and the age of beans.
  }

  public async editBrew(_brew: Brew) {

    const modal = await this.modalCtrl.create({component: BrewEditComponent, componentProps: {brew: _brew}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBrews();
  }

  public async brewAction(action: BREW_ACTION, brew: Brew): Promise<void> {
    switch (action) {
      case BREW_ACTION.REPEAT:
        this.repeatBrew(brew);
        break;
      case BREW_ACTION.DETAIL:
        this.detailBrew(brew);
        break;
      case BREW_ACTION.EDIT:
        this.editBrew(brew);
        break;
      case BREW_ACTION.DELETE:
        this.deleteBrew(brew);
        break;
      case BREW_ACTION.PHOTO_GALLERY:
        this.viewPhotos(brew);
        break;
      default:
        break;
    }
  }

  public async repeatBrew(_brew: Brew) {
    // const repeatBrewModel = this.modalCtrl.create(BrewsAddModal, {brew_template: brew});
    // repeatBrewModel.onDidDismiss(() => {
    //   this.loadBrews();
    // });
    // repeatBrewModel.present({animate: false});
    const modal = await this.modalCtrl.create({component: BrewAddComponent, componentProps: {brew_template: _brew}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBrews();
  }


  public async add() {
    if (this.uiBrewHelper.canBrewIfNotShowMessage()) {
      const modal = await this.modalCtrl.create({component: BrewAddComponent});
      await modal.present();
      await modal.onWillDismiss();
      this.loadBrews();
    }

  }

  public async detailBrew(_brew: Brew) {
    const modal = await this.modalCtrl.create({component: BrewDetailComponent, componentProps: {brew: _brew}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBrews();
  }

  public async viewPhotos(_brew: Brew) {
    const modal = await this.modalCtrl.create({component: BrewPhotoViewComponent, componentProps: {brew: _brew}});
    await modal.present();
    await modal.onWillDismiss();
  }

  public deleteBrew(_brew: Brew): void {
    this.uiAlert.showConfirm('DELETE_BREW_QUESTION', 'SURE_QUESTION', true).then(() => {
          // Yes
          this.__deleteBrew(_brew);
        this.uiToast.showInfoToast('TOAST_BREW_DELETED_SUCCESSFULLY');
        },
        () => {
          // No
        });

  }



  public loadBrews(): void {
    this.__initializeBrews();
    this.changeDetectorRef.detectChanges();
  }

  private __deleteBrew(_brew: Brew): void {
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
            header: this.translate.instant('DOWNLOADED'),
            subHeader: this.translate.instant('CSV_FILE_DOWNLOADED_SUCCESSFULLY', {fileName: _savedFile.name}),
            buttons: ['OK']
          });
          await alert.present();
        } else {
          this.socialSharing.share(undefined, undefined, _savedFile.nativeURL);

        }

      }, async () => {
        // No export possible.
        const alert = await this.alertCtrl.create({
          header: this.translate.instant('ERROR_OCCURED'),
          subHeader: this.translate.instant('CSV_FILE_NOT_DOWNLOADED'),
          buttons: ['OK']
        });
        await alert.present();
      });

    };

    const entries: Array<Array<{ VALUE: any, LABEL: string }>> = [];
    for (const i of this.brews) {
      const brew: Brew = i;

      const entry: Array<{ VALUE: any, LABEL: string }> = [
        {VALUE: this.uiHelper.formateDate(brew.config.unix_timestamp, 'DD.MM.YYYY HH:mm'), LABEL: this.translate.instant('DAY')},
        {VALUE: brew.grind_size, LABEL: this.translate.instant('BREW_DATA_GRIND_SIZE')},
        {VALUE: brew.grind_weight, LABEL: this.translate.instant('BREW_DATA_GRIND_WEIGHT')},
        {VALUE: brew.getPreparation().name, LABEL: this.translate.instant('BREW_DATA_PREPARATION_METHOD')},
        {VALUE: brew.getBean().name, LABEL: this.translate.instant('BREW_DATA_BEAN_TYPE')},
        {VALUE: brew.getBean().roaster, LABEL: this.translate.instant('BEAN_DATA_ROASTER')},
        {VALUE: brew.brew_temperature, LABEL: this.translate.instant('BREW_DATA_BREW_TEMPERATURE')},
        {VALUE: brew.brew_temperature_time, LABEL: this.translate.instant('BREW_DATA_TEMPERATURE_TIME')},
        {VALUE: brew.brew_time, LABEL: this.translate.instant('BREW_DATA_TIME')},
        {VALUE: brew.pressure_profile, LABEL: this.translate.instant('BREW_DATA_PRESSURE_PROFILE')},
        {VALUE: brew.mill_speed, LABEL: this.translate.instant('BREW_DATA_MILL_SPEED')},
        {VALUE: brew.mill_timer, LABEL: this.translate.instant('BREW_DATA_MILL_TIMER')},
        {VALUE: brew.getMill().name, LABEL: this.translate.instant('BREW_DATA_MILL')},
        {VALUE: brew.brew_quantity, LABEL: this.translate.instant('BREW_DATA_BREW_QUANTITY')},
        {VALUE: brew.getBrewQuantityTypeName(), LABEL: this.translate.instant('BREW_INFORMATION_BREW_QUANTITY_TYPE_NAME')},
        {VALUE: brew.note, LABEL: this.translate.instant('BREW_DATA_NOTES')},
        {VALUE: brew.rating, LABEL: this.translate.instant('BREW_DATA_RATING')},
        {VALUE: brew.coffee_type, LABEL: this.translate.instant('BREW_DATA_COFFEE_TYPE')},
        {VALUE: brew.coffee_concentration, LABEL: this.translate.instant('BREW_DATA_COFFEE_CONCENTRATION')},
        {VALUE: brew.coffee_first_drip_time, LABEL: this.translate.instant('BREW_DATA_COFFEE_FIRST_DRIP_TIME')},
        {VALUE: brew.coffee_blooming_time, LABEL: this.translate.instant('BREW_DATA_COFFEE_BLOOMING_TIME')},
        {VALUE: brew.getCalculatedBeanAge(), LABEL: this.translate.instant('BREW_INFORMATION_BEAN_AGE')},
        {VALUE: brew.getBrewRatio(), LABEL: this.translate.instant('BREW_INFORMATION_BREW_RATIO')},
        {VALUE: brew.getBean().finished, LABEL: this.translate.instant('FINISHED') + '?'},
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
    this.archivedBrewsCount = 0;
    this.openBrewsCount = 0;

    this.__initializeBrewView('open');
    this.__initializeBrewView('archiv');
  }

  private __sortBrews(_sortingBrews: Array<Brew>): Array<Brew> {
    const sortedBrews: Array<Brew> = _sortingBrews.sort((obj1, obj2) => {
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

  public isFilterActive(): boolean {
    if (this.brew_segment === 'open') {
      return (this.openBrewsFilter.bean.length > 0 ||
        this.openBrewsFilter.method_of_preparation.length > 0 ||
        this.openBrewsFilter.mill.length > 0);
    } else {
      return (this.archivedBrewsFilter.bean.length > 0 ||
        this.archivedBrewsFilter.method_of_preparation.length > 0 ||
        this.archivedBrewsFilter.mill.length > 0);
    }
  }

  // Treat the instructor name as the unique identifier for the object
  public trackByUUID(index, instructor: Bean) {
    return instructor.config.uuid;
  }

  public async showFilter() {
    let brewFilter: IBrewPageFilter;
    if (this.brew_segment === 'open') {
      brewFilter = {...this.openBrewsFilter};
    } else {
      brewFilter = {...this.archivedBrewsFilter};
    }

    const modal = await this.modalCtrl.create({
      component: BrewFilterComponent, cssClass: 'bottom-modal', showBackdrop: true, componentProps:
        {brew_filter: brewFilter, segment: this.brew_segment}
    });
    await modal.present();
    const modalData = await modal.onWillDismiss();

    if (modalData.data.brew_filter !== undefined) {
      if (this.brew_segment === 'open') {
        this.openBrewsFilter = modalData.data.brew_filter;

      } else {
        this.archivedBrewsFilter = modalData.data.brew_filter;
      }
    }
    this.__saveBrewFilter();


    this.loadBrews();
  }

  private __saveBrewFilter() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    settings.brew_filter.OPEN = this.openBrewsFilter;
    settings.brew_filter.ARCHIVED = this.archivedBrewsFilter;
    this.uiSettingsStorage.saveSettings(settings);

  }

  private __initializeBrewView(_type: string): void {
// sort latest to top.
    const brewsCopy: Array<Brew> = [...this.brews];
    let brewsFilters: Array<Brew>;

    const isOpen: boolean = (_type === 'open');
    if (isOpen) {
      brewsFilters = brewsCopy.filter((e) =>
        e.getBean().finished === !isOpen &&
        e.getMill().finished === !isOpen &&
        e.getPreparation().finished === !isOpen
      );
    } else {
      brewsFilters = brewsCopy.filter((e) =>
        e.getBean().finished === !isOpen ||
        e.getMill().finished === !isOpen ||
        e.getPreparation().finished === !isOpen
      );
    }



    let filter: IBrewPageFilter;
    if (isOpen) {
      filter = this.openBrewsFilter;
    } else {
      filter = this.archivedBrewsFilter;
    }

    if (this.settings.mill === true && filter.mill.length > 0) {
      brewsFilters = brewsFilters.filter((e) => filter.mill.filter((z) => z === e.mill).length > 0);
    }
    if (this.settings.bean_type === true && filter.bean.length > 0) {
      brewsFilters = brewsFilters.filter((e) => filter.bean.filter((z) => z === e.bean).length > 0);
    }
    if (this.settings.method_of_preparation === true && filter.method_of_preparation.length > 0) {
      brewsFilters = brewsFilters.filter((e) => filter.method_of_preparation.filter((z) => z === e.method_of_preparation).length > 0);
    }

    const sortedBrews: Array<Brew> = this.__sortBrews(brewsFilters);
    if (_type === 'open') {
      this.openBrewsView = sortedBrews;
    } else {
      this.archiveBrewsView = sortedBrews;
    }

  }
  public ngOnInit() {
  }


}
