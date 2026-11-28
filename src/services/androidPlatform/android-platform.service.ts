import { inject, Service } from '@angular/core';

import { Platform } from '@ionic/angular';

import { AutomaticBackupService } from '../automaticBackup/automatic-backup.service';
import { UIAlert } from '../uiAlert';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIExportImportHelper } from '../uiExportImportHelper';
import { UIFileHelper } from '../uiFileHelper';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStorage } from '../uiStorage';
import { WidgetSnapshotService } from '../widgetSnapshot/widget-snapshot.service';

@Service()
export class AndroidPlatformService {
  private readonly uiStorage = inject(UIStorage);
  private readonly uiLog = inject(UILog);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly automaticBackup = inject(AutomaticBackupService);
  private readonly widgetSnapshot = inject(WidgetSnapshotService);
  private readonly platform = inject(Platform);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiExportImportHelper = inject(UIExportImportHelper);

  constructor() {
    if (this.platform.is('capacitor') && this.platform.is('android')) {
      this.uiHelper.isBeanconqurorAppReady().then(
        () => {
          this.uiFileHelper.deleteOldAutomaticBackups().then(
            () => {},
            () => {},
          );
        },
        () => {},
      );
      this.automaticBackup.start('android-Platform', () =>
        this.uiExportImportHelper.saveAutomaticBackups(),
      );
      this.widgetSnapshot.start();
    }
  }
}
