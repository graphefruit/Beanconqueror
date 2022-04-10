import { Component, OnInit } from '@angular/core';
import {Settings} from '../../classes/settings/settings';
import {ModalController, Platform} from '@ionic/angular';
import {UIAnalytics} from '../../services/uiAnalytics';
import {UISettingsStorage} from '../../services/uiSettingsStorage';

@Component({
  selector: 'app-qr-code-scanner-popover',
  templateUrl: './qr-code-scanner-popover.component.html',
  styleUrls: ['./qr-code-scanner-popover.component.scss'],
})
export class QrCodeScannerPopoverComponent implements OnInit {

  public static POPOVER_ID: string = 'qr-code-scanner-popover';
  public readonly settings: Settings;


  private disableHardwareBack;
  constructor(private readonly modalController: ModalController,
              private readonly uiAnalytics: UIAnalytics,
              private readonly uiSettingsStorage: UISettingsStorage,
              private readonly platform: Platform) {
    this.settings = this.uiSettingsStorage.getSettings();


  }

  public ngOnInit() {
    try {
      this.disableHardwareBack = this.platform.backButton.subscribeWithPriority(9999, (processNextHandler) => {
        // Don't do anything.
      });
    }catch (ex) {

    }
  }

  public async saveSettings() {
    await this.uiSettingsStorage.saveSettings(this.settings);
  }

  public async finish() {
    try{
      this.disableHardwareBack.unsubscribe();
    } catch(ex) {

    }

    this.modalController.dismiss({
      dismissed: true
    }, undefined, QrCodeScannerPopoverComponent.POPOVER_ID);


  }

}
