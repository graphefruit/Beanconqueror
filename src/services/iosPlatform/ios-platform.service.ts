import { Injectable } from '@angular/core';

import { UIStorage } from '../uiStorage';
import { UIFileHelper } from '../uiFileHelper';
import { UILog } from '../uiLog';
import { EventQueueService } from '../queueService/queue-service.service';
import { AppEventType } from '../../enums/appEvent/appEvent';
import { Platform } from '@ionic/angular';
import { debounceTime } from 'rxjs/operators';
import moment from 'moment';
import { FileEntry } from '@awesome-cordova-plugins/file';
import { UIHelper } from '../uiHelper';
import { UIBrewStorage } from '../uiBrewStorage';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIAlert } from '../uiAlert';
import { UIExportImportHelper } from '../uiExportImportHelper';

@Injectable({
  providedIn: 'root',
})
export class IosPlatformService {
  constructor(
    private readonly uiStorage: UIStorage,
    private readonly uiLog: UILog,
    private readonly uiFileHelper: UIFileHelper,
    private readonly eventQueue: EventQueueService,
    private readonly platform: Platform,
    private readonly uiHelper: UIHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiAlert: UIAlert,
    private readonly uiExportImportHelper: UIExportImportHelper
  ) {
    if (this.platform.is('cordova') && this.platform.is('ios')) {
      this.uiHelper.isBeanconqurorAppReady().then(
        () => {
          // Delete on startup old json backup files
          this.uiFileHelper.deleteZIPBackupsOlderThenSevenDays().then(
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
          this.uiLog.log('iOS-Platform - Start to export ZIP file');
          try {
            this.uiExportImportHelper.saveAutomaticBackups();
          } catch (ex) {}
        });
    }
  }
}
