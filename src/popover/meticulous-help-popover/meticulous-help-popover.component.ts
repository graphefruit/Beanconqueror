import { Component, inject, OnInit } from '@angular/core';

import {
  IonButton,
  IonCol,
  IonContent,
  IonFooter,
  IonHeader,
  IonRow,
  IonTitle,
  ModalController,
  Platform,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { Settings } from '../../classes/settings/settings';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UISettingsStorage } from '../../services/uiSettingsStorage';

@Component({
  selector: 'app-meticulous-help-popover',
  templateUrl: './meticulous-help-popover.component.html',
  styleUrls: ['./meticulous-help-popover.component.scss'],
  imports: [
    TranslatePipe,
    IonHeader,
    IonTitle,
    IonContent,
    IonFooter,
    IonRow,
    IonCol,
    IonButton,
  ],
})
export class MeticulousHelpPopoverComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly platform = inject(Platform);

  public static POPOVER_ID: string = 'meticulous-help-popover';
  private readonly settings: Settings;

  private disableHardwareBack;
  public finishButtonDisabled: boolean = true;
  public delayCounter: number = 15;
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
