import { inject, Service } from '@angular/core';

import { Platform } from '@ionic/angular';

import moment from 'moment';

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
export class IosPlatformService {
  private readonly uiStorage = inject(UIStorage);
  private readonly uiLog = inject(UILog);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly automaticBackup = inject(AutomaticBackupService);
  private readonly widgetSnapshot = inject(WidgetSnapshotService);
  private readonly platform = inject(Platform);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiExportImportHelper = inject(UIExportImportHelper);

  constructor() {
    if (this.platform.is('capacitor') && this.platform.is('ios')) {
      this.uiHelper.isBeanconqurorAppReady().then(
        () => {
          this.uiFileHelper.deleteOldAutomaticBackups().then(
            () => {},
            () => {},
          );
        },
        () => {},
      );
      this.automaticBackup.start('iOS-Platform', () =>
        this.uiStorage.get('MILL').then(
          // We just do an automatic export, if the data could be grabbed and the database connection is established.
          () => this.uiExportImportHelper.saveAutomaticBackups(),
          () => {},
        ),
      );
      this.widgetSnapshot.start();
    }
  }
}
