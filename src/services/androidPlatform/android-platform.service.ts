import { Injectable } from '@angular/core';
import { UIStorage } from '../uiStorage';
import { UILog } from '../uiLog';
import { UIFileHelper } from '../uiFileHelper';
import { EventQueueService } from '../queueService/queue-service.service';
import { Platform } from '@ionic/angular';
import { AppEventType } from '../../enums/appEvent/appEvent';
import { debounceTime } from 'rxjs/operators';
import { FileEntry } from '@ionic-native/file';
import { UIHelper } from '../uiHelper';
import moment from 'moment';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { UIAlert } from '../uiAlert';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIBrewStorage } from '../uiBrewStorage';
@Injectable({
  providedIn: 'root',
})
export class AndroidPlatformService {
  constructor(
    private readonly uiStorage: UIStorage,
    private readonly uiLog: UILog,
    private readonly uiFileHelper: UIFileHelper,
    private readonly eventQueue: EventQueueService,
    private readonly platform: Platform,
    private readonly uiHelper: UIHelper,
    private readonly androidPermissions: AndroidPermissions,
    private readonly uiAlert: UIAlert,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiBrewStorage: UIBrewStorage
  ) {
    if (this.platform.is('cordova') && this.platform.is('android')) {
      this.uiHelper.isBeanconqurorAppReady().then(
        () => {
          // Delete on startup old json backup files
          this.uiFileHelper.deleteJSONBackupsOlderThenSevenDays().then(
            () => {},
            () => {}
          );
        },
        () => {}
      );
      this.eventQueue
        .on(AppEventType.STORAGE_CHANGED)
        .pipe(
          // Wait for 3 seconds before we call the the debounce
          debounceTime(3000)
        )
        .subscribe((event) => {
          this.__saveBeanconquerorDump();
          this.__saveAutomaticBeanconquerorDump();
        });
    }
  }

  private getAutomatedBackupFilename(): string {
    return moment().format('DD_MM_YYYY').toString();
  }

  private __saveBeanconquerorDump() {
    this.uiLog.log('android-Platform - Start to export JSON file');
    this.uiStorage.export().then((_data) => {
      this.uiFileHelper
        .saveJSONFile('Beanconqueror.json', JSON.stringify(_data))
        .then(
          async () => {
            this.uiLog.log('android-Platform - JSON file successfully saved');
          },
          () => {
            this.uiLog.error('android-Platform - JSON file could not be saved');
          }
        );
    });
  }
  private __saveAutomaticBeanconquerorDump() {
    const settings = this.uiSettingsStorage.getSettings();
    const welcomePagedShowed: boolean = settings.welcome_page_showed;
    const brewsAdded: boolean = this.uiBrewStorage.getAllEntries().length > 0;
    if (welcomePagedShowed === true && brewsAdded === true) {
      //Just save the dumps after we showed the welcome page, else we ask user for permission and save automatically.
      this.uiLog.log('Android-Platform - Start to export JSON file');
      this.uiStorage.export().then((_data) => {
        this.uiHelper
          .exportJSON(
            'Beanconqueror_automatic_export_' +
              this.getAutomatedBackupFilename() +
              '.json',
            JSON.stringify(_data),
            false
          )
          .then(
            async (_fileEntry: FileEntry) => {
              this.uiLog.log('Android-Platform - JSON file successfully saved');
            },
            () => {
              this.uiLog.error(
                'Android-Platform - JSON file could not be saved'
              );
            }
          );
      });
    }
  }

  private requestExternalStorageAccess() {
    const promise = new Promise((resolve, reject) => {
      this.androidPermissions
        .requestPermission(
          this.androidPermissions.PERMISSION.WRITE_EXTERNAL_STORAGE
        )
        .then(
          (_status) => {
            if (_status.hasPermission) {
              resolve(undefined);
            } else {
              reject();
            }
          },
          () => {
            reject();
          }
        );
    });
    return promise;
  }

  public async checkHasExternalStorage() {
    const promise = new Promise((resolve, reject) => {
      this.androidPermissions
        .hasPermission(
          this.androidPermissions.PERMISSION.WRITE_EXTERNAL_STORAGE
        )
        .then(
          async (_status) => {
            if (_status.hasPermission === false) {
              await this.uiAlert.showMessage(
                'ANDROID_FILE_ACCESS_NEEDED_DESCRIPTION',
                'ANDROID_FILE_ACCESS_NEEDED_TITLE',
                undefined,
                true
              );
              this.requestExternalStorageAccess().then(
                () => {
                  resolve(undefined);
                },
                () => {
                  reject();
                }
              );
            } else {
              resolve(undefined);
            }
          },
          () => {
            reject();
          }
        );
    });
    return promise;
  }

  public async checkAndroidBackup() {
    try {
      const promise = new Promise(async (resolve, reject) => {
        if (this.platform.is('cordova') && this.platform.is('android')) {
          this.uiLog.log('android-Platform - Check Android Backup');
          const hasData = await this.uiStorage.hasData();
          this.uiLog.log(
            'android-Platform - Check Android Backup - Has data ' + hasData
          );
          if (!hasData) {
            this.uiLog.log(
              'android-Platform - Check Android Backup - No data are stored yet inside the app, so we try to find a backup file'
            );
            // If we don't got any data, we check now if there is a Beanconqueror.json saved.
            this.uiFileHelper.getJSONFile('Beanconqueror.json').then(
              async (_json) => {
                await this.uiAlert.showLoadingSpinner();
                this.uiLog.log(
                  'android-Platform - We found a backup, try to import'
                );
                this.uiStorage.import(_json).then(
                  async () => {
                    this.uiLog.log(
                      'android-Platform sucessfully imported  Backup'
                    );
                    setTimeout(() => {
                      this.uiAlert.hideLoadingSpinner();
                    }, 150);
                    resolve(null);
                  },
                  () => {
                    this.uiLog.error(
                      'android-Platform could not import  Backup'
                    );
                    setTimeout(() => {
                      this.uiAlert.hideLoadingSpinner();
                    }, 150);
                    resolve(null);
                  }
                );
              },
              () => {
                this.uiLog.log(
                  'android-Platform - Check Android Backup - We couldnt retrieve any file'
                );
                resolve(null);
              }
            );
          } else {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
      return promise;
    } catch (ex) {}
  }
}
