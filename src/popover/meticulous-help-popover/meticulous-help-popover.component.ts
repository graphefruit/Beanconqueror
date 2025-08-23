import { Component, OnInit } from '@angular/core';
import { Settings } from '../../classes/settings/settings';
import { ModalController, Platform } from '@ionic/angular';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UISettingsStorage } from '../../services/uiSettingsStorage';

@Component({
  selector: 'app-meticulous-help-popover',
  templateUrl: './meticulous-help-popover.component.html',
  styleUrls: ['./meticulous-help-popover.component.scss'],
  standalone: false,
})
export class MeticulousHelpPopoverComponent implements OnInit {
  public static POPOVER_ID: string = 'meticulous-help-popover';
  private readonly settings: Settings;

  private disableHardwareBack;
  public finishButtonDisabled: boolean = true;
  public delayCounter: number = 15;
  constructor(
    private readonly modalController: ModalController,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly platform: Platform,
  ) {
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

      const delayIntv = setInterval(() => {
        this.delayCounter = this.delayCounter - 1;
        if (this.delayCounter <= 0) {
          this.finishButtonDisabled = false;
          clearInterval(delayIntv);
        } else {
        }
      }, 1000);
    } catch (ex) {}
  }

  public async finish() {
    try {
      this.disableHardwareBack.unsubscribe();
    } catch (ex) {}

    this.settings.meticulous_help_was_shown = true;
    await this.uiSettingsStorage.saveSettings(this.settings);

    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      MeticulousHelpPopoverComponent.POPOVER_ID,
    );
  }
}
