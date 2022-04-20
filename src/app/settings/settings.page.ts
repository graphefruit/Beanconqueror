import {AlertController, ModalController, Platform} from '@ionic/angular';
import BeanconquerorSettingsDummy from '../../assets/BeanconquerorTestData.json';
import {Bean} from '../../classes/bean/bean';
import {BluetoothScale} from './../../classes/devices/bluetoothDevice';
import {Brew} from '../../classes/brew/brew';
import {BREW_VIEW_ENUM} from '../../enums/settings/brewView';
import {ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {debounceTime, distinctUntilChanged} from 'rxjs/operators';
import {DirectoryEntry, FileEntry} from '@ionic-native/file';
import {FileChooser} from '@ionic-native/file-chooser/ngx';
import {File} from '@ionic-native/file/ngx';
import {FilePath} from '@ionic-native/file-path/ngx';
import {IBean} from '../../interfaces/bean/iBean';
import {IBrew} from '../../interfaces/brew/iBrew';
import {IOSFilePicker} from '@ionic-native/file-picker/ngx';
import {ISettings} from '../../interfaces/settings/iSettings';
import {Mill} from '../../classes/mill/mill';
import {Settings} from '../../classes/settings/settings';
import {SocialSharing} from '@ionic-native/social-sharing/ngx';
import {STARTUP_VIEW_ENUM} from '../../enums/settings/startupView';
import {Subject, Subscription} from 'rxjs';
import {TranslateService} from '@ngx-translate/core';
import {UIAlert} from '../../services/uiAlert';
import {UIAnalytics} from '../../services/uiAnalytics';
import {UIBeanStorage} from '../../services/uiBeanStorage';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {UIHelper} from '../../services/uiHelper';
import {UILog} from '../../services/uiLog';
import {UIMillStorage} from '../../services/uiMillStorage';
import {UIPreparationStorage} from '../../services/uiPreparationStorage';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {UIStorage} from '../../services/uiStorage';


/** Third party */
import {AnalyticsPopoverComponent} from '../../popover/analytics-popover/analytics-popover.component';
import {AndroidPermissions} from '@ionic-native/android-permissions/ngx';
import {BleManagerService} from '../../services/bleManager/ble-manager.service';
import {CurrencyService} from '../../services/currencyService/currency.service';
import {GreenBean} from '../../classes/green-bean/green-bean';
import {IGreenBean} from '../../interfaces/green-bean/iGreenBean';
import {IMill} from '../../interfaces/mill/iMill';
import {IPreparation} from '../../interfaces/preparation/iPreparation';
import {IRoastingMachine} from '../../interfaces/roasting-machine/iRoastingMachine';
import moment from 'moment';
import {Preparation} from '../../classes/preparation/preparation';
import {RoastingMachine} from '../../classes/roasting-machine/roasting-machine';
import SETTINGS_TRACKING from '../../data/tracking/settingsTracking';
import {UIExcel} from '../../services/uiExcel';
import {UIGreenBeanStorage} from '../../services/uiGreenBeanStorage';
import {UIHealthKit} from '../../services/uiHealthKit';
import {UIRoastingMachineStorage} from '../../services/uiRoastingMachineStorage';
import {UIToast} from '../../services/uiToast';
import {UIUpdate} from '../../services/uiUpdate';
import {UiVersionStorage} from '../../services/uiVersionStorage';
import {UIWaterStorage} from '../../services/uiWaterStorage';
import {Water} from '../../classes/water/water';
import {AppEvent} from '../../classes/appEvent/appEvent';
import {AppEventType} from '../../enums/appEvent/appEvent';
import {EventQueueService} from '../../services/queueService/queue-service.service';


declare var cordova: any;
declare var device: any;


declare var window: any;

@Component({
  selector: 'settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  public settings: Settings;

  public BREW_VIEWS = BREW_VIEW_ENUM;
  public STARTUP_VIEW = STARTUP_VIEW_ENUM;
  public debounceLanguageFilter: Subject<string> = new Subject<string>();

  public isHealthSectionAvailable: boolean = false;

  public currencies = {};

  public settings_segment: string = "general";
  private __cleanupAttachmentData(_data: Array<IBean | IBrew | IMill | IPreparation | IGreenBean | IRoastingMachine>): any {
    if (_data !== undefined && _data.length > 0) {
      for (const obj of _data) {
        obj.attachments = [];
      }
    }

  }



  public ngOnDestroy() {

  }


  private __cleanupImportSettingsData(_data: ISettings | any): void {
    // We need to remove the filter because of new data here.
    if (_data !== undefined) {
      _data.brew_filter = {};
      _data.brew_filter.ARCHIVED = this.settings.GET_BREW_FILTER();
      _data.brew_filter.OPEN = this.settings.GET_BREW_FILTER();

      _data.bean_filter.OPEN = this.settings.GET_BEAN_FILTER();
      _data.bean_filter.ARCHIVED = this.settings.GET_BEAN_FILTER();

    }
  }

  constructor(private readonly platform: Platform,
              public uiSettingsStorage: UISettingsStorage,
              public uiStorage: UIStorage,
              public uiHelper: UIHelper,
              private readonly fileChooser: FileChooser,
              private readonly filePath: FilePath,
              private readonly file: File,
              private readonly alertCtrl: AlertController,
              private readonly uiAlert: UIAlert,
              private readonly uiPreparationStorage: UIPreparationStorage,
              private readonly uiBeanStorage: UIBeanStorage,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiMillStorage: UIMillStorage,
              private readonly iosFilePicker: IOSFilePicker,
              private readonly socialSharing: SocialSharing,
              private readonly uiLog: UILog,
              private readonly translate: TranslateService,
              private readonly changeDetectorRef: ChangeDetectorRef,
              private readonly uiAnalytics: UIAnalytics,
              private readonly androidPermissions: AndroidPermissions,
              private readonly uiUpdate: UIUpdate,
              private readonly uiVersionStorage: UiVersionStorage,
              private readonly uiExcel: UIExcel,
              private readonly uiHealthKit: UIHealthKit,
              private readonly modalCtrl: ModalController,
              private readonly uiRoastingMachineStorage: UIRoastingMachineStorage,
              private readonly uiGreenBeanStorage: UIGreenBeanStorage,
              private readonly uiWaterStorage: UIWaterStorage,
              private readonly bleManager: BleManagerService,
              private readonly uiToast: UIToast,
              private readonly currencyService: CurrencyService,
              private readonly eventQueue: EventQueueService,
  ) {
    this.__initializeSettings();
    this.debounceLanguageFilter
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe(() => {
        this.setLanguage();
      });

    this.currencies = this.currencyService.getCurrencies();

    this.uiHealthKit.isAvailable().then(() => {
      this.isHealthSectionAvailable = true;
    }, () => {
      this.isHealthSectionAvailable = false;
    });
  }


  public async ngOnInit() {

  }

  public async findAndConnectScale(_retry: boolean = false) {
    const hasLocationPermission: boolean = await this.bleManager.hasLocationPermission();
    if (!hasLocationPermission) {
      await this.uiAlert.showMessage('SCALE.REQUEST_PERMISSION.LOCATION', undefined, undefined, true);
      await this.bleManager.requestLocationPermissions();
    }

    const hasBluetoothPermission: boolean = await this.bleManager.hasBluetoothPermission();
    if (!hasBluetoothPermission) {
      await this.uiAlert.showMessage('SCALE.REQUEST_PERMISSION.BLUETOOTH', undefined, undefined, true);
      await this.bleManager.requestBluetoothPermissions();
    }


    const bleEnabled: boolean = await this.bleManager.isBleEnabled();
    if (bleEnabled === false) {
      await this.uiAlert.showMessage('SCALE.BLUETOOTH_NOT_ENABLED', undefined, undefined, true);
      return;
    }


    await this.uiAlert.showLoadingSpinner();
    this.uiAlert.setLoadingSpinnerMessage('SCALE.BLUETOOTH_SCAN_RUNNING', true);
    const scale = await this.bleManager.tryToFindScale();
    if (scale) {
      await this.uiAlert.hideLoadingSpinner();
      try {
        // We don't need to retry for iOS, because we just did scan before.

        // NEVER!!! Await here, else the bluetooth logic will get broken.
        this.bleManager.autoConnectScale(scale.type, scale.id, false);
      } catch(ex) {

      }

      this.settings.scale_id = scale.id;
      this.settings.scale_type = scale.type;

      this.uiAnalytics.trackEvent(SETTINGS_TRACKING.TITLE, SETTINGS_TRACKING.ACTIONS.SCALE.CATEGORY,SETTINGS_TRACKING.ACTIONS.SCALE.DATA.SCALE_TYPE,scale.type);

      await this.saveSettings();

      const connectedScale = this.bleManager.getScale();
      await connectedScale.setLed(true, true);

    } else {
      await this.uiAlert.hideLoadingSpinner();
      this.uiAlert.showMessage('SCALE.CONNECTION_NOT_ESTABLISHED', undefined, undefined, true);
    }
  }

  public async disconnectScale() {
    this.eventQueue.dispatch(new AppEvent(AppEventType.BLUETOOTH_SCALE_DISCONNECT, undefined));
    let disconnected: boolean = true;

    //if scale is connected, we try to disconnect, if scale is not connected, we just forget scale :)
    if (this.settings.scale_id !== '' && this.bleManager.getScale()) {
      disconnected = await this.bleManager.disconnect(this.settings.scale_id);
    }

    if (disconnected) {
      this.settings.scale_id = '';
      this.settings.scale_type = null;
      await this.saveSettings();
    }
  }

  public async retryConnectScale() {
    await this.findAndConnectScale(true);
  }

  public isScaleConnected(): boolean {
    return this.bleManager.getScale() !== null;
  }


  public async checkWaterSection() {
    if (this.settings.show_water_section === false) {
      await this.uiAlert.showLoadingSpinner();
      try {
        this.settings.manage_parameters.water = true;
        await this.saveSettings();

        const preps: Array<Preparation> = this.uiPreparationStorage.getAllEntries();
        if (preps.length > 0) {
          for (const prep of preps) {
            prep.manage_parameters.water = true;
            await this.uiPreparationStorage.update(prep);
          }
        }
      } catch (ex) {

      }

      await this.uiAlert.hideLoadingSpinner();
    }
  }

  public checkHealthPlugin() {
    // #200 - Didn't save the settings
    if (this.settings.track_caffeine_consumption === false) {
      this.uiAlert.showConfirm('HEALTH_KIT_QUESTION_MESSAGE', 'HEALTH_KIT_QUESTION_TITLE', true).then(() => {
        this.uiHealthKit.requestAuthorization().then(async () => {
          // Allowed
          this.settings.track_caffeine_consumption = true;
          await this.saveSettings();
        }, async () => {
          // Forbidden
          this.settings.track_caffeine_consumption = false;
          await this.saveSettings();
        });
      }, async () => {
        this.settings.track_caffeine_consumption = false;
        await this.saveSettings();
      });
    }


  }


  public checkCoordinates() {
    if (this.platform.is('android')) {
      // Request permission,
      this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION).then((_status) => {
        this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION).then((_status) => {
        }, () => {
        });
      }, () => {
      });
    }
  }

  public async changeBrewRating() {
    this.settings.resetFilter();
    await this.saveSettings();
  }

  public async saveSettings() {
    this.changeDetectorRef.detectChanges();
    await this.uiSettingsStorage.saveSettings(this.settings);
  }

  public async showAnalyticsInformation() {
    const modal = await this.modalCtrl.create({component: AnalyticsPopoverComponent, id: AnalyticsPopoverComponent.POPOVER_ID});
    await modal.present();
    await modal.onWillDismiss();
  }

  public languageChanged(_query): void {
    this.debounceLanguageFilter.next(_query);
  }

  public setLanguage(): void {
    this.translate.setDefaultLang(this.settings.language);
    this.translate.use(this.settings.language);
    this.uiAnalytics.trackEvent(SETTINGS_TRACKING.TITLE, SETTINGS_TRACKING.ACTIONS.SET_LANGUAGE.CATEGORY, SETTINGS_TRACKING.ACTIONS.SET_LANGUAGE.DATA.LANGUAGE, this.settings.language);
    this.uiSettingsStorage.saveSettings(this.settings);
    moment.locale(this.settings.language);
  }

  public import(): void {
    if (this.platform.is('cordova')) {
      this.uiAnalytics.trackEvent(SETTINGS_TRACKING.TITLE, SETTINGS_TRACKING.ACTIONS.IMPORT);
      this.uiLog.log('Import real data');
      if (this.platform.is('android')) {
        this.fileChooser.open()
          .then(async (uri) => {
            try {
              const fileEntry: any = await new Promise(async (resolve) =>
                await window.resolveLocalFileSystemURL(uri, resolve)
              );
              const newPath: string = await this.filePath.resolveNativePath(fileEntry.nativeURL);
              let importPath: string = '';
              if (newPath.lastIndexOf('/Download/') > -1) {
                let pathFromDownload = newPath.substr(0, newPath.lastIndexOf('/Download/'));
                const decodedURI = decodeURIComponent(uri);
                pathFromDownload = pathFromDownload + decodedURI.substring(decodedURI.lastIndexOf('/Download/'));
                importPath = pathFromDownload;
                importPath = importPath.substring(0, importPath.lastIndexOf('/') + 1);
              } else {
                // After the new API-Changes we just can support this download path
                importPath = this.file.externalRootDirectory + 'Download/Beanconqueror_export/';
              }

              this.__readAndroidJSONFile(fileEntry, importPath).then(() => {
                // nothing todo
              }, (_err) => {
                this.uiAlert.showMessage(this.translate.instant('ERROR_ON_FILE_READING') + ' (' + JSON.stringify(_err) + ')');
              });
            } catch (ex) {
              this.uiAlert.showMessage(this.translate.instant('FILE_NOT_FOUND_INFORMATION') + ' (' + JSON.stringify(ex) + ')');
            }
          });
      } else {
        this.iosFilePicker.pickFile().then((uri) => {
          if (uri && uri.endsWith('.json')) {
            let path = uri.substring(0, uri.lastIndexOf('/'));
            const file = uri.substring(uri.lastIndexOf('/') + 1, uri.length);
            if (path.indexOf('file://') !== 0) {
              path = 'file://' + path;
            }
            this.__readJSONFile(path, file).then(() => {
              // nothing todo
            }).catch((_err) => {
              this.uiAlert.showMessage(this.translate.instant('FILE_NOT_FOUND_INFORMATION') + ' (' + JSON.stringify(_err) + ')');
            });
          } else {
            this.uiAlert.showMessage(this.translate.instant('INVALID_FILE_FORMAT'));
          }
        });

      }
    } else {
      this.__importDummyData();
    }
  }

  public isMobile(): boolean {
    return (this.platform.is('android') || this.platform.is('ios'));
  }

  private async exportAttachments() {
    const exportObjects: Array<any> =
      [...this.uiBeanStorage.getAllEntries(),
        ...this.uiBrewStorage.getAllEntries(),
        ...this.uiPreparationStorage.getAllEntries(),
        ...this.uiMillStorage.getAllEntries(),
        ...this.uiWaterStorage.getAllEntries(),
        ...this.uiGreenBeanStorage.getAllEntries(),
        ...this.uiRoastingMachineStorage.getAllEntries()];

    await this._exportAttachments(exportObjects);
  }


  private async exportFlowProfiles() {
    const exportObjects: Array<any> =[...this.uiBrewStorage.getAllEntries()];
    await this._exportFlowProfiles(exportObjects);
  }

  public async export() {

    await this.uiAlert.showLoadingSpinner();

    this.uiAnalytics.trackEvent(SETTINGS_TRACKING.TITLE, SETTINGS_TRACKING.ACTIONS.EXPORT);


    this.uiStorage.export().then((_data) => {
      this.uiHelper.exportJSON('Beanconqueror.json', JSON.stringify(_data)).then(async (_fileEntry: FileEntry) => {

        if (this.platform.is('cordova')) {
          if (this.platform.is('android')) {

            await this.exportAttachments();
            await this.exportFlowProfiles();
            await this.uiAlert.hideLoadingSpinner();

            const alert = await this.alertCtrl.create({
              header: this.translate.instant('DOWNLOADED'),
              subHeader: this.translate.instant('FILE_DOWNLOADED_SUCCESSFULLY', {fileName: _fileEntry.name}),
              buttons: ['OK']
            });
            await alert.present();
          } else {
            await this.uiAlert.hideLoadingSpinner();
            // File already downloaded
            // We don't support image export yet, because
          }
        } else {
          await this.uiAlert.hideLoadingSpinner();
          // File already downloaded
          // We don't support image export yet, because
        }


      }, async () => {
        await this.uiAlert.hideLoadingSpinner();
      });

    }, async () => {
      await this.uiAlert.hideLoadingSpinner();
    });

  }

  public excelExport(): void {
    this.uiExcel.export();
  }

  private async _exportAttachments(_storedData: Array<Bean> | Array<Brew> | Array<Preparation> | Array<Mill> | Array<GreenBean> | Array<RoastingMachine> | Array<Water>) {
    for (const entry of _storedData) {
      for (const attachment of entry.attachments) {
        await this._exportFile(attachment);
      }
    }
  }
  private async _exportFlowProfiles(_storedData: Array <Brew>) {
    for (const entry of _storedData) {
      if (entry.flow_profile) {
        await this._exportFile(entry.flow_profile);
      }

    }
  }


  private async _exportFile(_filePath) {
    let path: string;
    let fileName: string;
    path = this.file.dataDirectory;
    fileName = _filePath;
    if (fileName.startsWith('/')) {
      fileName = fileName.slice(1);
    }
    let storageLocation: string = '';

    switch (device.platform) {

      case 'Android':
        storageLocation = cordova.file.externalRootDirectory;
        break;
      case 'iOS':
        storageLocation = cordova.file.documentsDirectory;
        break;
    }

    try {
      const fileSystem: any = await new Promise(async (resolve) =>
        await window.resolveLocalFileSystemURL(storageLocation, resolve)
      );

      const directory: DirectoryEntry = await new Promise(async (resolve) =>
        await fileSystem.getDirectory('Download', {
          create: true,
          exclusive: false
        }, resolve)
      );
      let exportDirectory: DirectoryEntry = await new Promise(async (resolve) =>
        await directory.getDirectory('Beanconqueror_export', {
          create: true,
          exclusive: false
        }, resolve)
      );

      let exportingFilename = '';
      const folders = fileName.split('/');
      for (let i=0;i<folders.length;i++) {
        const folderName = folders[i];
        if (folderName.indexOf('.')>=0) {
          //We found the filename woop
          exportingFilename = folderName.trim();
        } else if(folderName !=='') {
          //We found another folder, create it or just get it
          path = path + folderName + '/';
          exportDirectory  = await new Promise(async (resolve) =>
            await exportDirectory.getDirectory(folderName, {
              create: true,
              exclusive: false
            }, resolve)
          );
        }
      }

      await this.file.copyFile(path, exportingFilename, exportDirectory.nativeURL, exportingFilename);
    } catch (ex) {

    }


  }

  private async _importFiles(_storedData: Array<Bean> | Array<Brew> | Array<Preparation> | Array<Mill> | Array<GreenBean> | Array<RoastingMachine> | Array<Water>, _importPath: string) {
    for (const entry of _storedData) {
      for (const attachment of entry.attachments) {
        await this._importFile(attachment, _importPath);
      }
    }
  }

  private async _importFile(_filePath: string, _importPath: string) {
    let path: string;
    let fileName: string;
    path = this.file.dataDirectory;
    fileName = _filePath;
    if (fileName.startsWith('/')) {
      fileName = fileName.slice(1);
    }
    let storageLocation: string = '';

    switch (device.platform) {

      case 'Android':
        storageLocation = _importPath;
        break;
      case 'iOS':
        storageLocation = cordova.file.documentsDirectory;
        break;
    }

    try {
      try {
        // extra catch because maybe file is not existing
        await this.file.removeFile(path, fileName);
      } catch (ex) {

      }
      await this.file.copyFile(storageLocation, fileName, path, fileName);
    } catch (ex) {
      this.uiLog.error('Import file ' + ex.message);
    }
  }


  /* tslint:disable */
  private __importDummyData(): void {
    this.uiLog.log('Import dummy data');
    const dummyData = BeanconquerorSettingsDummy;

    if (dummyData.SETTINGS[0]['brew_order']['before'] === undefined) {
      this.uiLog.log('Old brew order structure');
      // Breaking change, we need to throw away the old order types by import
      const settingsConst = new Settings();
      dummyData['SETTINGS'][0]['brew_order'] = this.uiHelper.copyData(settingsConst.brew_order);
    }
    this.__cleanupImportSettingsData(dummyData['SETTINGS'][0]);

    this.uiStorage.import(dummyData).then(async () => {
      this.__reinitializeStorages().then(async () => {
        this.uiAnalytics.disableTracking();
        this.__initializeSettings();
        this.settings.resetFilter();
        this.setLanguage();
        await this.uiAlert.showMessage(this.translate.instant('IMPORT_SUCCESSFULLY'));
        if (this.settings.matomo_analytics === undefined) {
          await this.showAnalyticsInformation();
        } else {
          this.uiAnalytics.enableTracking();
        }
      });
    });
  }

  /* tslint:enable */
  private async __readAndroidJSONFile(_fileEntry: FileEntry, _importPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      _fileEntry.file(async (file) => {
        const reader = new FileReader();
        reader.onloadend = (event: Event) => {
          this.__importJSON(reader.result as string, _importPath);

        };
        reader.onerror = (event: Event) => {
          reject();
        };

        reader.readAsText(file);
      });

    });
  }

  /* tslint:enable */
  private async __readJSONFile(path, file): Promise<any> {
    return new Promise((resolve, reject) => {
      this.file.readAsText(path, file)
        .then((content) => {
          this.__importJSON(content, path);
        })
        .catch((err) => {
          reject(err);

        });
    });
  }


  private async __importJSON(_content: string, _importPath: string) {
    const parsedContent = JSON.parse(_content);

    const isIOS: boolean = this.platform.is('ios');
    // Set empty arrays if not existing.
    if (!parsedContent[this.uiPreparationStorage.getDBPath()]) {
      parsedContent[this.uiPreparationStorage.getDBPath()] = [];
    }
    if (!parsedContent[this.uiBeanStorage.getDBPath()]) {
      parsedContent[this.uiBeanStorage.getDBPath()] = [];
    }
    if (!parsedContent[this.uiBrewStorage.getDBPath()]) {
      parsedContent[this.uiBrewStorage.getDBPath()] = [];
    }
    if (!parsedContent[this.uiSettingsStorage.getDBPath()]) {
      parsedContent[this.uiSettingsStorage.getDBPath()] = [];
    }
    if (!parsedContent[this.uiRoastingMachineStorage.getDBPath()]) {
      parsedContent[this.uiRoastingMachineStorage.getDBPath()] = [];
    }
    if (!parsedContent[this.uiGreenBeanStorage.getDBPath()]) {
      parsedContent[this.uiGreenBeanStorage.getDBPath()] = [];
    }
    if (!parsedContent[this.uiWaterStorage.getDBPath()]) {
      parsedContent[this.uiWaterStorage.getDBPath()] = [];
    }
    if (!parsedContent[this.uiVersionStorage.getDBPath()]) {
      parsedContent[this.uiVersionStorage.getDBPath()] = [];
    }
    if (parsedContent[this.uiPreparationStorage.getDBPath()] &&
      parsedContent[this.uiBeanStorage.getDBPath()] &&
      parsedContent[this.uiBrewStorage.getDBPath()] &&
      parsedContent[this.uiSettingsStorage.getDBPath()]) {
      /**
        * We don't need to remove the parsed image paths anymore, because they are stored inside the documents-storage and can be read there
        if (isIOS) {
        this.__cleanupAttachmentData(parsedContent[this.uiBeanStorage.getDBPath()]);
        this.__cleanupAttachmentData(parsedContent[this.uiBrewStorage.getDBPath()]);

        this.__cleanupAttachmentData(parsedContent[this.uiRoastingMachineStorage.getDBPath()]);
        this.__cleanupAttachmentData(parsedContent[this.uiGreenBeanStorage.getDBPath()]);
        this.__cleanupAttachmentData(parsedContent[this.uiPreparationStorage.getDBPath()]);
        this.__cleanupAttachmentData(parsedContent[this.uiMillStorage.getDBPath()]);
        this.__cleanupAttachmentData(parsedContent[this.uiWaterStorage.getDBPath()]);
        }
       **/
      this.__cleanupImportSettingsData(parsedContent[this.uiSettingsStorage.getDBPath()]);

      // When exporting the value is a number, when importing it needs to be  a string.
      parsedContent['SETTINGS'][0]['brew_view'] = parsedContent['SETTINGS'][0]['brew_view'] + '';
      try {
        if (!parsedContent['SETTINGS'][0]['brew_order']['before'] === undefined) {
          this.uiLog.log('Old brew order structure');
          // Breaking change, we need to throw away the old order types by import
          const settingsConst = new Settings();
          parsedContent['SETTINGS'][0]['brew_order'] = this.uiHelper.copyData(settingsConst.brew_order);
        }
      } catch (ex) {
        const settingsConst = new Settings();
        parsedContent['SETTINGS'][0]['brew_order'] = this.uiHelper.copyData(settingsConst.brew_order);
      }

      await this.uiAlert.showLoadingSpinner();
      this.uiStorage.import(parsedContent).then(async (_data) => {
        if (_data.BACKUP === false) {
          this.__reinitializeStorages().then(async () => {
            this.uiAnalytics.disableTracking();
            this.__initializeSettings();

            if (!isIOS) {
              const brewsData: Array<Brew> = this.uiBrewStorage.getAllEntries();
              const beansData: Array<Bean> = this.uiBeanStorage.getAllEntries();
              const preparationData: Array<Preparation> = this.uiPreparationStorage.getAllEntries();
              const millData: Array<Mill> = this.uiMillStorage.getAllEntries();
              const greenBeanData: Array<GreenBean> = this.uiGreenBeanStorage.getAllEntries();
              const roastingMachineData: Array<RoastingMachine> = this.uiRoastingMachineStorage.getAllEntries();
              const waterData: Array<Water> = this.uiWaterStorage.getAllEntries();

              await this._importFiles(brewsData, _importPath);
              await this._importFiles(beansData, _importPath);
              await this._importFiles(preparationData, _importPath);
              await this._importFiles(millData, _importPath);
              await this._importFiles(greenBeanData, _importPath);
              await this._importFiles(roastingMachineData, _importPath);
              await this._importFiles(waterData, _importPath);
            }

            if (this.uiBrewStorage.getAllEntries().length > 0 && this.uiMillStorage.getAllEntries().length <= 0) {
              // We got an update and we got no mills yet, therefore we add a Standard mill.
              const data: Mill = new Mill();
              data.name = 'Standard';
              await this.uiMillStorage.add(data);

              const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
              for (const brew of brews) {
                brew.mill = data.config.uuid;
                await this.uiBrewStorage.update(brew);
              }
            }
            this.setLanguage();

            this.settings.resetFilter();
            await this.uiSettingsStorage.saveSettings(this.settings);
            await this.uiAlert.hideLoadingSpinner();
            await this.uiAlert.showMessage(this.translate.instant('IMPORT_SUCCESSFULLY'));
            if (this.settings.matomo_analytics === undefined) {
              await this.showAnalyticsInformation();
            } else {
              this.uiAnalytics.enableTracking();
            }
          }, async () => {
            await this.uiAlert.hideLoadingSpinner();
          });

        } else {
          await this.uiAlert.hideLoadingSpinner();
          this.uiAlert.showMessage(this.translate.instant('IMPORT_UNSUCCESSFULLY_DATA_NOT_CHANGED'));
        }

      }, async () => {
        await this.uiAlert.hideLoadingSpinner();
        this.uiAlert.showMessage(this.translate.instant('IMPORT_UNSUCCESSFULLY_DATA_NOT_CHANGED'));
      });

    } else {
      this.uiAlert.showMessage(this.translate.instant('INVALID_FILE_DATA'));
    }
  }

  private __initializeSettings(): void {
    this.settings = this.uiSettingsStorage.getSettings();

  }

  private async __reinitializeStorages(): Promise<any> {
    return new Promise(async (resolve) => {

      await this.uiBeanStorage.reinitializeStorage();
      await this.uiPreparationStorage.reinitializeStorage();
      await this.uiSettingsStorage.reinitializeStorage();
      await this.uiBrewStorage.reinitializeStorage();
      await this.uiMillStorage.reinitializeStorage();
      await this.uiVersionStorage.reinitializeStorage();
      await this.uiGreenBeanStorage.reinitializeStorage();
      await this.uiRoastingMachineStorage.reinitializeStorage();
      await this.uiWaterStorage.reinitializeStorage();

      // Wait for every necessary service to be ready before starting the app
      // Settings and version, will create a new object on start, so we need to wait for this in the end.
      const beanStorageReadyCallback = this.uiBeanStorage.storageReady();
      const preparationStorageReadyCallback = this.uiPreparationStorage.storageReady();
      const uiSettingsStorageReadyCallback = this.uiSettingsStorage.storageReady();
      const brewStorageReadyCallback = this.uiBrewStorage.storageReady();
      const millStorageReadyCallback = this.uiMillStorage.storageReady();
      const versionStorageReadyCallback = this.uiVersionStorage.storageReady();
      const greenBeanStorageCallback = this.uiGreenBeanStorage.storageReady();
      const roastingMachineStorageCallback = this.uiRoastingMachineStorage.storageReady();
      const waterStorageCallback = this.uiWaterStorage.storageReady();


      Promise.all([
        beanStorageReadyCallback,
        preparationStorageReadyCallback,
        brewStorageReadyCallback,
        uiSettingsStorageReadyCallback,
        millStorageReadyCallback,
        versionStorageReadyCallback,
        greenBeanStorageCallback,
        roastingMachineStorageCallback,
        waterStorageCallback
      ]).then(async () => {
        await this.uiUpdate.checkUpdate();
        resolve(undefined);
      }, () => {
        resolve(undefined);
      });
    });
  }


}
