import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCol,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonRadio,
  IonRadioGroup,
  IonRow,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { shareSocialOutline } from 'ionicons/icons';

import { FileInfo } from '@capacitor/filesystem';
import { TranslatePipe } from '@ngx-translate/core';
import moment from 'moment';

import { Settings } from '../../classes/settings/settings';
import { HeaderComponent } from '../../components/header/header.component';
import {
  isMigrationBackup,
  PreImportBackupService,
} from '../../services/preImportBackup/pre-import-backup.service';
import { ShareService } from '../../services/shareService/share-service.service';
import { UIAlert } from '../../services/uiAlert';
import { UIFileHelper } from '../../services/uiFileHelper';
import { UISettingsStorage } from '../../services/uiSettingsStorage';

/** Below 0.01 MB in kB, as a small backup would otherwise read "0MB". */
export function fileSize(bytes: number): string {
  const megabytes = bytes / 1024 / 1024;
  return megabytes < 0.01
    ? `${Math.ceil(bytes / 1024)}kB`
    : `${+megabytes.toFixed(2)}MB`;
}

/** A backup file as the list shows it. */
export interface BackupListEntry {
  file: FileInfo;
  /** Written before the data updates, shown with a label instead of its name. */
  beforeDataUpdate: boolean;
  /** The internal backup, replaced after every change. */
  latest: boolean;
  size: string;
  /** Day in the format of the settings and time, in local time. */
  date: string;
}

export function backupListEntry(
  _file: FileInfo,
  _latest: boolean,
  _dateFormat: string,
): BackupListEntry {
  return {
    file: _file,
    beforeDataUpdate: isMigrationBackup(_file.name),
    latest: _latest,
    size: fileSize(_file.size),
    date: moment(_file.mtime).format(`${_dateFormat} HH:mm`),
  };
}

@Component({
  selector: 'app-settings-choose-automatic-backup-to-import',
  templateUrl: './settings-choose-automatic-backup-to-import.component.html',
  styleUrls: ['./settings-choose-automatic-backup-to-import.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    TranslatePipe,
    IonHeader,
    IonContent,
    HeaderComponent,
    IonCard,
    IonCardContent,
    IonRadioGroup,
    IonItem,
    IonRadio,
    IonLabel,
    IonFooter,
    IonRow,
    IonCol,
    IonButton,
    IonIcon,
  ],
})
export class SettingsChooseAutomaticBackupToImportComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly preImportBackup = inject(PreImportBackupService);
  private readonly shareService = inject(ShareService);
  private readonly uiAlert = inject(UIAlert);

  public static POPOVER_ID: string =
    'choose-automatic-backup-to-import-popover';

  public importChoosenURI: string = '';

  public foundBackupFiles: BackupListEntry[] = [];
  public settings: Settings;
  constructor() {
    this.settings = this.uiSettingsStorage.getSettings();
    addIcons({ shareSocialOutline });
  }

  public async ngOnInit() {
    // Replaced after every change, so normally the newest data comes first.
    const internalBackup =
      await this.uiFileHelper.statInternalFile('Beanconqueror.zip');
    const files = [
      ...(await this.uiFileHelper.listAutomaticBackupFiles()),
      // Saved before each import. They are in the app data directory, which
      // the file picker of the import cannot open on Android.
      ...(await this.preImportBackup.list()),
    ].sort((a: FileInfo, b: FileInfo) => {
      return b.mtime - a.mtime;
    });
    this.foundBackupFiles = (
      internalBackup ? [internalBackup, ...files] : files
    ).map((_file) =>
      backupListEntry(
        _file,
        _file === internalBackup,
        this.settings?.date_format,
      ),
    );
  }

  /** Lets the user keep the backup at `_uri` outside the app, for example in a cloud. */
  public async share(_uri: string): Promise<void> {
    if (!(await this.shareService.shareStoredFile(_uri))) {
      await this.uiAlert.showMessage(
        'BACKUP_NOT_SHARED',
        undefined,
        undefined,
        true,
      );
    }
  }

  public async saveSettings() {}

  public async close() {
    this.modalController.dismiss(
      {
        choosenURI: '',
      },
      undefined,
      SettingsChooseAutomaticBackupToImportComponent.POPOVER_ID,
    );
  }

  public async finish() {
    this.modalController.dismiss(
      {
        choosenURI: this.importChoosenURI,
      },
      undefined,
      SettingsChooseAutomaticBackupToImportComponent.POPOVER_ID,
    );
  }
}
