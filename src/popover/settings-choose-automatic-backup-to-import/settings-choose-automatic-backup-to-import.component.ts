import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UIFileHelper } from '../../services/uiFileHelper';
import { FileInfo } from '@capacitor/filesystem';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { Settings } from '../../classes/settings/settings';
import { UIHelper } from '../../services/uiHelper';

@Component({
  selector: 'app-settings-choose-automatic-backup-to-import',
  templateUrl: './settings-choose-automatic-backup-to-import.component.html',
  styleUrls: ['./settings-choose-automatic-backup-to-import.component.scss'],
})
export class SettingsChooseAutomaticBackupToImportComponent implements OnInit {
  public static POPOVER_ID: string =
    'choose-automatic-backup-to-import-popover';

  public importChoosenURI: string = '';

  public foundBackupFiles: Array<FileInfo> = [];
  public settings: Settings;
  constructor(
    private readonly modalController: ModalController,
    private readonly uiFileHelper: UIFileHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    protected readonly uiHelper: UIHelper,
  ) {
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
