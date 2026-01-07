import { Injectable, inject } from '@angular/core';
import { UIStorage } from '../uiStorage';
import { UILog } from '../uiLog';
import { UIFileHelper } from '../uiFileHelper';
import { EventQueueService } from '../queueService/queue-service.service';
import { Platform } from '@ionic/angular/standalone';
import { AppEventType } from '../../enums/appEvent/appEvent';
import { debounceTime } from 'rxjs/operators';

import { UIHelper } from '../uiHelper';

import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { UIAlert } from '../uiAlert';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIExportImportHelper } from '../uiExportImportHelper';
@Injectable({
  providedIn: 'root',
})
export class AndroidPlatformService {
  private readonly uiStorage = inject(UIStorage);
  private readonly uiLog = inject(UILog);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly eventQueue = inject(EventQueueService);
  private readonly platform = inject(Platform);
  private readonly uiHelper = inject(UIHelper);
  private readonly androidPermissions = inject(AndroidPermissions);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiExportImportHelper = inject(UIExportImportHelper);

  constructor() {
    if (this.platform.is('capacitor') && this.platform.is('android')) {
      this.uiHelper.isBeanconqurorAppReady().then(
        () => {
          // Delete on startup old json backup files
          this.uiFileHelper.deleteZIPBackupsOlderThanSevenDays().then(
            () => {},
            () => {},
          );
        },
        () => {},
      );
      this.eventQueue
        .on(AppEventType.STORAGE_CHANGED)
        .pipe(
          // Wait for 3 seconds before we call the the debounce
          debounceTime(3000),
        )
        .subscribe((event) => {
          this.uiLog.log('android-Platform - Start to export ZIP file');
          try {
            this.uiExportImportHelper.saveAutomaticBackups();
          } catch (ex) {}
        });
    }
  }

  /* private requestExternalStorageAccess() {
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
    }*/
}
