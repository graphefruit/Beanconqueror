import { Component, OnInit, inject } from '@angular/core';
import { Settings } from '../../classes/settings/settings';
import { ModalController, Platform } from '@ionic/angular/standalone';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonTitle,
  IonContent,
  IonFooter,
  IonItem,
  IonCheckbox,
  IonRow,
  IonCol,
  IonButton,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-qr-code-scanner-popover',
  templateUrl: './qr-code-scanner-popover.component.html',
  styleUrls: ['./qr-code-scanner-popover.component.scss'],
  imports: [
    FormsModule,
    TranslatePipe,
    IonHeader,
    IonTitle,
    IonContent,
    IonFooter,
    IonItem,
    IonCheckbox,
    IonRow,
    IonCol,
    IonButton,
  ],
})
export class QrCodeScannerPopoverComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly platform = inject(Platform);

  public static POPOVER_ID: string = 'qr-code-scanner-popover';
  public readonly settings: Settings;

  private disableHardwareBack;
  constructor() {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public ngOnInit() {
    try {
      this.disableHardwareBack = this.platform.backButton.subscribeWithPriority(
        9999,
        (processNextHandler) => {
          // Don't do anything.
        },
      );
    } catch (ex) {}
  }

  public async saveSettings() {
    await this.uiSettingsStorage.saveSettings(this.settings);
  }

  public async finish() {
    try {
      this.disableHardwareBack.unsubscribe();
    } catch (ex) {}

    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      QrCodeScannerPopoverComponent.POPOVER_ID,
    );
  }
}
