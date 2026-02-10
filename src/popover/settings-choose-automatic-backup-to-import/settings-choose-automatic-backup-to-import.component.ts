import { Component, inject, OnInit } from '@angular/core';
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
} from '@ionic/angular/standalone';

import { FileInfo } from '@capacitor/filesystem';
import { TranslatePipe } from '@ngx-translate/core';

import { Settings } from '../../classes/settings/settings';
import { HeaderComponent } from '../../components/header/header.component';
import { FormatDatePipe } from '../../pipes/formatDate';
import { UIFileHelper } from '../../services/uiFileHelper';
import { UIHelper } from '../../services/uiHelper';
import { UISettingsStorage } from '../../services/uiSettingsStorage';

@Component({
  selector: 'app-settings-choose-automatic-backup-to-import',
  templateUrl: './settings-choose-automatic-backup-to-import.component.html',
  styleUrls: ['./settings-choose-automatic-backup-to-import.component.scss'],
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
  protected readonly uiHelper = inject(UIHelper);

  public static POPOVER_ID: string =
    'choose-automatic-backup-to-import-popover';

  public importChoosenURI: string = '';

  public foundBackupFiles: Array<FileInfo> = [];
  public settings: Settings;
  constructor() {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public async ngOnInit() {
    const files = await this.uiFileHelper.listAutomaticBackupFiles();
    if (files.length > 0) {
      this.foundBackupFiles = files.sort((a: FileInfo, b: FileInfo) => {
        return b.size - a.size;
      });
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
