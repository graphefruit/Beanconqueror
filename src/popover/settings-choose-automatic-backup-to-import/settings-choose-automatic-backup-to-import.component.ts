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
  IonItem,
  IonLabel,
  IonRadio,
  IonRadioGroup,
  IonRow,
  ModalController,
} from '@ionic/angular';

import { FileInfo } from '@capacitor/filesystem';
import { TranslatePipe } from '@ngx-translate/core';

import { Settings } from '../../classes/settings/settings';
import { HeaderComponent } from '../../components/header/header.component';
import { FormatDatePipe } from '../../pipes/formatDate';
import {
  isMigrationBackup,
  PreImportBackupService,
} from '../../services/preImportBackup/pre-import-backup.service';
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
}

@Component({
  selector: 'app-settings-choose-automatic-backup-to-import',
  templateUrl: './settings-choose-automatic-backup-to-import.component.html',
  styleUrls: ['./settings-choose-automatic-backup-to-import.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    TranslatePipe,
    FormatDatePipe,
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
  ],
})
export class SettingsChooseAutomaticBackupToImportComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly preImportBackup = inject(PreImportBackupService);

  public static POPOVER_ID: string =
    'choose-automatic-backup-to-import-popover';

  public importChoosenURI: string = '';

  public foundBackupFiles: BackupListEntry[] = [];
  public settings: Settings;
  constructor() {
    this.settings = this.uiSettingsStorage.getSettings();
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
    ).map((_file) => ({
      file: _file,
      beforeDataUpdate: isMigrationBackup(_file.name),
    }));
  }

  protected readonly fileSize = fileSize;

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
