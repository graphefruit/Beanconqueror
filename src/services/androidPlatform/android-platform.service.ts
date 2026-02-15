import { inject, Injectable } from '@angular/core';

import { Platform } from '@ionic/angular/standalone';

import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { debounceTime } from 'rxjs/operators';

import { AppEventType } from '../../enums/appEvent/appEvent';
import { EventQueueService } from '../queueService/queue-service.service';
import { UIAlert } from '../uiAlert';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIExportImportHelper } from '../uiExportImportHelper';
import { UIFileHelper } from '../uiFileHelper';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStorage } from '../uiStorage';

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
}
