import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {BREW_VIEW_ENUM} from '../../enums/settings/brewView';
import {IBean} from '../../interfaces/bean/iBean';
import {IBrew} from '../../interfaces/brew/iBrew';
import {AlertController, ModalController, Platform} from '@ionic/angular';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {UIStorage} from '../../services/uiStorage';
import {UIHelper} from '../../services/uiHelper';
import {FileChooser} from '@ionic-native/file-chooser/ngx';
import {FilePath} from '@ionic-native/file-path/ngx';
import {UIAlert} from '../../services/uiAlert';
import {UIPreparationStorage} from '../../services/uiPreparationStorage';
import {UIBeanStorage} from '../../services/uiBeanStorage';
import {UIMillStorage} from '../../services/uiMillStorage';
import {IOSFilePicker} from '@ionic-native/file-picker/ngx';
import {SocialSharing} from '@ionic-native/social-sharing/ngx';
import {DirectoryEntry, FileEntry} from '@ionic-native/file';
import {File} from '@ionic-native/file/ngx';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {Brew} from '../../classes/brew/brew';
import {Mill} from '../../classes/mill/mill';
import {Settings} from '../../classes/settings/settings';
import {UILog} from '../../services/uiLog';
import {TranslateService} from '@ngx-translate/core';
import {debounceTime, distinctUntilChanged} from 'rxjs/operators';
import {Subject} from 'rxjs';
import {STARTUP_VIEW_ENUM} from '../../enums/settings/startupView';
import {UIAnalytics} from '../../services/uiAnalytics';

import BeanconquerorSettingsDummy from '../../assets/BeanconquerorTestData.json';
import {ISettings} from '../../interfaces/settings/iSettings';
import {Bean} from '../../classes/bean/bean';
/** Third party */
import moment from 'moment';
import {AndroidPermissions} from '@ionic-native/android-permissions/ngx';
import {UIUpdate} from '../../services/uiUpdate';
import {UiVersionStorage} from '../../services/uiVersionStorage';
import {UIExcel} from '../../services/uiExcel';
import {UIHealthKit} from '../../services/uiHealthKit';
import {Preparation} from '../../classes/preparation/preparation';
import {GreenBean} from '../../classes/green-bean/green-bean';
import {RoastingMachine} from '../../classes/roasting-machine/roasting-machine';
import SETTINGS_TRACKING from '../../data/tracking/settingsTracking';
import {AnalyticsPopoverComponent} from '../../popover/analytics-popover/analytics-popover.component';
import {UIRoastingMachineStorage} from '../../services/uiRoastingMachineStorage';
import {UIGreenBeanStorage} from '../../services/uiGreenBeanStorage';
import {IPreparation} from '../../interfaces/preparation/iPreparation';
import {IGreenBean} from '../../interfaces/green-bean/iGreenBean';
import {IRoastingMachine} from '../../interfaces/roasting-machine/iRoastingMachine';
import {IMill} from '../../interfaces/mill/iMill';
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


  private static __cleanupAttachmentData(_data: Array<IBean | IBrew | IMill | IPreparation | IGreenBean | IRoastingMachine>): any {
    if (_data !== undefined && _data.length > 0) {
      for (const obj of _data) {
        obj.attachments = [];
      }
    }

  }


  private static __cleanupImportSettingsData(_data: ISettings | any): void {
    // We need to remove the filter because of new data here.
    if (_data !== undefined) {
      _data.brew_filter = {};
      _data.brew_filter.ARCHIVED = Settings.GET_BREW_FILTER();
      _data.brew_filter.OPEN = Settings.GET_BREW_FILTER();
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
              private readonly uiGreenBeanStorage: UIGreenBeanStorage
              ) {
    this.__initializeSettings();
    this.debounceLanguageFilter
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe(() => {
        this.setLanguage();
      });


    this.uiHealthKit.isAvailable().then( () => {
      this.isHealthSectionAvailable = true;
    }, () => {
        this.isHealthSectionAvailable = false;
      })
  }




  public ngOnInit() {

  }

  public checkHealthPlugin() {
    // #200 - Didn't save the settings
    if (this.settings.track_caffeine_consumption === false) {
      this.uiAlert.showConfirm('HEALTH_KIT_QUESTION_MESSAGE','HEALTH_KIT_QUESTION_TITLE', true).then( () => {
        this.uiHealthKit.requestAuthorization().then(() => {
          // Allowed
          this.settings.track_caffeine_consumption = true;
          this.saveSettings();
        }, () => {
          // Forbidden
          this.settings.track_caffeine_consumption = false;
          this.saveSettings();
        });
      }, () => {
        this.settings.track_caffeine_consumption = false;
        this.saveSettings();
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
      },() => {});
    }
  }


  public saveSettings(): void {
    this.changeDetectorRef.detectChanges();
    this.uiSettingsStorage.saveSettings(this.settings);
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
    this.uiAnalytics.trackEvent(SETTINGS_TRACKING.TITLE, SETTINGS_TRACKING.ACTIONS.SET_LANGUAGE.CATEGORY,SETTINGS_TRACKING.ACTIONS.SET_LANGUAGE.DATA.LANGUAGE, this.settings.language);
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
              if (newPath.lastIndexOf('/Download/')>-1) {
                let pathFromDownload = newPath.substr(0,newPath.lastIndexOf('/Download/'));
                const decodedURI = decodeURIComponent(uri);
                pathFromDownload = pathFromDownload + decodedURI.substring(decodedURI.lastIndexOf('/Download/'));
                importPath = pathFromDownload;
              } else {
                importPath = newPath;
              }
              importPath = importPath.substring(0,importPath.lastIndexOf('/') +1);
              this.__readAndroidJSONFile(fileEntry,importPath).then(() => {
                // nothing todo
              }, (_err) => {
                this.uiAlert.showMessage(this.translate.instant('ERROR_ON_FILE_READING') + ' (' + JSON.stringify(_err) + ')');
              });
            }
            catch (ex) {
              this.uiAlert.showMessage(this.translate.instant('FILE_NOT_FOUND_INFORMATION') + ' (' + JSON.stringify(ex.message) + ')');
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

  public isMobile (): boolean {
    return (this.platform.is('android') || this.platform.is('ios'));
  }


  public async export() {

    await this.uiAlert.showLoadingSpinner();

    this.uiAnalytics.trackEvent(SETTINGS_TRACKING.TITLE, SETTINGS_TRACKING.ACTIONS.EXPORT);
    this.uiStorage.export().then((_data) => {
      this.uiHelper.exportJSON('Beanconqueror.json', JSON.stringify(_data)).then(async (_fileEntry: FileEntry) => {
        if (this.platform.is('android'))
        {
          const beans: Array<Bean> = this.uiBeanStorage.getAllEntries();
          const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
          const preparations: Array<Preparation> = this.uiPreparationStorage.getAllEntries();
          const mills: Array<Mill> = this.uiMillStorage.getAllEntries();
          await this._exportAttachments(beans);
          await this._exportAttachments(brews);
          await this._exportAttachments(preparations);
          await this._exportAttachments(mills);
          await this.uiAlert.hideLoadingSpinner();
          const alert =  await this.alertCtrl.create({
            header: this.translate.instant('DOWNLOADED'),
            subHeader: this.translate.instant('FILE_DOWNLOADED_SUCCESSFULLY', {fileName: _fileEntry.name}),
            buttons: ['OK']
          });
          await alert.present();
        } else {
          await this.uiAlert.hideLoadingSpinner();
          this.socialSharing.share(undefined, undefined, _fileEntry.nativeURL);
          // We don't support image export yet, because
        }

      }, async () => {
        await this.uiAlert.hideLoadingSpinner();
      });

    },async () => {
      await this.uiAlert.hideLoadingSpinner();
    });

  }

  public excelExport(): void {
    this.uiExcel.export();
  }

  private async _exportAttachments(_storedData: Array<Bean> | Array<Brew> | Array<Preparation> | Array<Mill> | Array<GreenBean> | Array<RoastingMachine>)
  {
    for (const entry of _storedData) {
      for (const attachment of entry.attachments) {
        await this._exportFile(attachment);
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
        const exportDirectory: DirectoryEntry = await new Promise(async (resolve) =>
          await directory.getDirectory('Beanconqueror_export', {
            create: true,
            exclusive: false
          }, resolve)
        );
        await this.file.copyFile(path, fileName, exportDirectory.nativeURL, fileName);
      } catch(ex){

      }


  }

  private async _importFiles(_storedData: Array<Bean> | Array<Brew>| Array<Preparation> | Array<Mill> | Array<GreenBean> | Array<RoastingMachine>,_importPath: string)
  {
    for (const entry of _storedData) {
      for (const attachment of entry.attachments) {
        await this._importFile(attachment,_importPath);
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
        await this.file.removeFile(path,fileName);
      }
      catch (ex){

      }
      await this.file.copyFile(storageLocation,fileName,path,fileName)
    } catch(ex){
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
    SettingsPage.__cleanupImportSettingsData(dummyData['SETTINGS'][0]);

    this.uiStorage.import(dummyData).then(async () => {
      this.__reinitializeStorages().then(async () => {
        this.uiAnalytics.disableTracking();
        this.__initializeSettings();
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
  private async __readAndroidJSONFile (_fileEntry: FileEntry,_importPath : string): Promise<any> {
    return new Promise((resolve, reject) => {
      _fileEntry.file(async (file) => {
        const reader = new FileReader();
        reader.onloadend = (event: Event) => {
          this.__importJSON(reader.result as string,_importPath);

        };
        reader.onerror = (event: Event) => {
          reject();
        };

        reader.readAsText(file);
      });

    });
  }

  /* tslint:enable */
  private async __readJSONFile (path, file): Promise<any> {
    return new Promise((resolve, reject) => {
      this.file.readAsText(path, file)
        .then((content) => {
          this.__importJSON(content,path);
        })
        .catch((err) => {
          reject(err);

        });
    });
  }


  private async __importJSON(_content: string,_importPath: string) {
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
    if (parsedContent[this.uiPreparationStorage.getDBPath()] &&
      parsedContent[this.uiBeanStorage.getDBPath()] &&
      parsedContent[this.uiBrewStorage.getDBPath()] &&
      parsedContent[this.uiSettingsStorage.getDBPath()]) {

      if (isIOS){
        SettingsPage.__cleanupAttachmentData(parsedContent[this.uiBeanStorage.getDBPath()]);
        SettingsPage.__cleanupAttachmentData(parsedContent[this.uiBrewStorage.getDBPath()]);

        SettingsPage.__cleanupAttachmentData(parsedContent[this.uiRoastingMachineStorage.getDBPath()]);
        SettingsPage.__cleanupAttachmentData(parsedContent[this.uiGreenBeanStorage.getDBPath()]);
        SettingsPage.__cleanupAttachmentData(parsedContent[this.uiPreparationStorage.getDBPath()]);
        SettingsPage.__cleanupAttachmentData(parsedContent[this.uiMillStorage.getDBPath()]);

      }
      SettingsPage.__cleanupImportSettingsData(parsedContent[this.uiSettingsStorage.getDBPath()]);

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
              const brewsData:Array<Brew> = this.uiBrewStorage.getAllEntries();
              const beansData:Array<Bean> = this.uiBeanStorage.getAllEntries();
              const preparationData:Array<Preparation> = this.uiPreparationStorage.getAllEntries();
              const millData:Array<Mill> = this.uiMillStorage.getAllEntries();
              await this._importFiles(brewsData,_importPath);
              await this._importFiles(beansData,_importPath);
              await this._importFiles(preparationData,_importPath);
              await this._importFiles(millData,_importPath);
            }

            if (this.uiBrewStorage.getAllEntries().length > 0 && this.uiMillStorage.getAllEntries().length <= 0) {
              // We got an update and we got no mills yet, therefore we add a Standard mill.
              const data: Mill = new Mill();
              data.name = 'Standard';
              this.uiMillStorage.add(data);

              const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
              for (const brew of brews) {
                brew.mill = data.config.uuid;
                this.uiBrewStorage.update(brew);
              }
            }
            this.setLanguage();
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

  private async __reinitializeStorages (): Promise<any> {
    return new Promise((resolve) => {

      this.uiBeanStorage.reinitializeStorage();
      this.uiBrewStorage.reinitializeStorage();
      this.uiPreparationStorage.reinitializeStorage();
      this.uiSettingsStorage.reinitializeStorage();
      this.uiMillStorage.reinitializeStorage();
      this.uiVersionStorage.reinitializeStorage();

      const beanStorageReadyCallback = this.uiBeanStorage.storageReady();
      const preparationStorageReadyCallback = this.uiPreparationStorage.storageReady();
      const uiSettingsStorageReadyCallback = this.uiSettingsStorage.storageReady();
      const brewStorageReadyCallback = this.uiBrewStorage.storageReady();
      const millStorageReadyCallback = this.uiMillStorage.storageReady();
      const versionStorageReadyCallback = this.uiVersionStorage.storageReady();
      Promise.all([
        beanStorageReadyCallback,
        preparationStorageReadyCallback,
        brewStorageReadyCallback,
        millStorageReadyCallback,
        uiSettingsStorageReadyCallback,
        versionStorageReadyCallback
      ]).then(() => {
        this.uiUpdate.checkUpdate();
        resolve();
      }, () => {
        resolve();
      });
    });
  }



}
