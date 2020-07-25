import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {BREW_VIEW_ENUM} from '../../enums/settings/brewView';
import {IBean} from '../../interfaces/bean/iBean';
import {IBrew} from '../../interfaces/brew/iBrew';
import {AlertController, Platform} from '@ionic/angular';
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
import {FileEntry} from '@ionic-native/file';
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

import BeanconquerorSettingsDummy from '../../assets/Beanconqueror.json';
import {ISettings} from '../../interfaces/settings/iSettings';
import {IBrewPageFilter} from '../../interfaces/brew/iBrewPageFilter';

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


  private static __cleanupImportBeanData(_data: Array<IBean>): any {
    if (_data !== undefined && _data.length > 0) {
      for (const bean of _data) {
        bean.filePath = '';
        bean.attachments = [];
      }
    }

  }

  private static __cleanupImportBrewData(_data: Array<IBrew>): void {
    if (_data !== undefined && _data.length > 0) {
      for (const brew of _data) {
        brew.attachments = [];
      }
    }
  }

  private static __cleanupImportSettingsData(_data: ISettings | any): void {
    // We need to remove the filter because of new data here.
    if (_data !== undefined) {
      _data.brew_filter = {};
      _data.brew_filter.ARCHIVED = {
        mill: [],
        bean: [],
        method_of_preparation: []
      } as IBrewPageFilter;
      _data.brew_filter.OPEN = {
        mill: [],
        bean: [],
        method_of_preparation: []
      } as IBrewPageFilter;
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
              private readonly uiAnalytics: UIAnalytics) {
    this.__initializeSettings();
    this.debounceLanguageFilter
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe(() => {
        this.setLanguage();
      });
  }




  public ngOnInit() {

  }

  public saveSettings(): void {
    this.changeDetectorRef.detectChanges();
    this.uiSettingsStorage.saveSettings(this.settings);
  }

  public checkAnalytics(): void {
    if (this.settings.analytics) {
      this.uiAnalytics.trackEvent('SETTINGS', 'TRACKING_ENABLE');
      this.uiAnalytics.enableTracking();
    } else {
      this.uiAnalytics.trackEvent('SETTINGS', 'TRACKING_DISABLE');
      // Last one here so, but we need to know, which users don't want any tracking.
      this.uiAnalytics.disableTracking();
    }
  }

  public languageChanged(_query): void {
    this.debounceLanguageFilter.next(_query);
  }

  public setLanguage(): void {
    this.translate.setDefaultLang(this.settings.language);
    this.translate.use(this.settings.language);
    this.uiAnalytics.trackEvent('SETTINGS', 'SET_LANGUAGE_ ' + this.settings.language);
    this.uiSettingsStorage.saveSettings(this.settings);
  }

  public import (): void {
    if (this.platform.is('cordova')) {
      this.uiAnalytics.trackEvent('SETTINGS', 'IMPORT');
      this.uiLog.log('Import real data');
      if (this.platform.is('android')) {
        this.fileChooser.open()
          .then((uri) => {
              this.filePath.resolveNativePath(uri).then((resolvedFilePath) => {
                try {
                  const path = resolvedFilePath.substring(0, resolvedFilePath.lastIndexOf('/'));
                  const file = resolvedFilePath.substring(resolvedFilePath.lastIndexOf('/') + 1, resolvedFilePath.length);
                  this.__readJSONFile(path, file).then(() => {
                    // nothing todo
                  }, (_err) => {
                    this.uiAlert.showMessage(this.translate.instant('ERROR_ON_FILE_READING') + ' (' + JSON.stringify(_err) + ')');
                  });
                } catch (ex) {
                  this.uiAlert.showMessage(this.translate.instant('INVALID_FILE_FORMAT'));
                }

              }).catch((_err) => {
                this.uiAlert.showMessage(this.translate.instant('FILE_NOT_FOUND_INFORMATION') + ' (' + JSON.stringify(_err) + ')');
              });

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


  public export(): void {
    this.uiAnalytics.trackEvent('SETTINGS', 'EXPORT');
    this.uiStorage.export().then((_data) => {
      this.uiHelper.exportJSON('Beanconqueror.json', JSON.stringify(_data)).then(async (_fileEntry: FileEntry) => {
        if (this.platform.is('android')) {
          const alert =  await this.alertCtrl.create({
            header: this.translate.instant('DOWNLOADED'),
            subHeader: this.translate.instant('FILE_DOWNLOADED_SUCCESSFULLY', {fileName: _fileEntry.name}),
            buttons: ['OK']
          });
          await alert.present();
        } else {
          this.socialSharing.share(undefined, undefined, _fileEntry.nativeURL);
        }

      });
    });

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
    this.uiStorage.import(dummyData).then(() => {
      this.__reinitializeStorages().then(() => {
        this.__initializeSettings();
        this.uiAlert.showMessage(this.translate.instant('IMPORT_SUCCESSFULLY'));
      });
    });
  }

  /* tslint:enable */
  private async __readJSONFile (path, file): Promise<any> {
    return new Promise((resolve, reject) => {
      this.file.readAsText(path, file)
          .then((content) => {
            const parsedContent = JSON.parse(content);

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

              SettingsPage.__cleanupImportBeanData(parsedContent[this.uiBeanStorage.getDBPath()]);
              SettingsPage.__cleanupImportBrewData(parsedContent[this.uiBrewStorage.getDBPath()]);
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


              this.uiStorage.import(parsedContent).then((_data) => {
                if (_data.BACKUP === false) {
                  this.__reinitializeStorages().then(() => {
                    this.__initializeSettings();

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

                    this.uiAlert.showMessage(this.translate.instant('IMPORT_SUCCESSFULLY'));
                  });

                } else {
                  this.uiAlert.showMessage(this.translate.instant('IMPORT_UNSUCCESSFULLY_DATA_NOT_CHANGED'));
                }

              }, () => {
                this.uiAlert.showMessage(this.translate.instant('IMPORT_UNSUCCESSFULLY_DATA_NOT_CHANGED'));
              });

            } else {
              this.uiAlert.showMessage(this.translate.instant('INVALID_FILE_DATA'));
            }
          })
          .catch((err) => {
            reject(err);

          });
    });
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

      const beanStorageReadyCallback = this.uiBeanStorage.storageReady();
      const preparationStorageReadyCallback = this.uiPreparationStorage.storageReady();
      const uiSettingsStorageReadyCallback = this.uiSettingsStorage.storageReady();
      const brewStorageReadyCallback = this.uiBrewStorage.storageReady();
      const millStorageReadyCallback = this.uiMillStorage.storageReady();
      Promise.all([
        beanStorageReadyCallback,
        preparationStorageReadyCallback,
        brewStorageReadyCallback,
        millStorageReadyCallback,
        uiSettingsStorageReadyCallback
      ]).then(() => {
        resolve();
      }, () => {
        resolve();
      });
    });
  }



}
