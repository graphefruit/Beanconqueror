import { Component, OnInit } from '@angular/core';
import { Settings } from '../../classes/settings/settings';
import { ModalController, Platform } from '@ionic/angular';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import moment from 'moment/moment';

@Component({
  selector: 'analytics-popover',
  templateUrl: './analytics-popover.component.html',
  styleUrls: ['./analytics-popover.component.scss'],
  standalone: false,
})
export class AnalyticsPopoverComponent implements OnInit {
  public static POPOVER_ID: string = 'analytics-popover';
  private readonly settings: Settings;

  private disableHardwareBack;
  constructor(
    private readonly modalController: ModalController,
    private readonly uiAnalytics: UIAnalytics,
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
    } catch (ex) {}
  }

  public async dontActivate() {
    try {
      this.disableHardwareBack.unsubscribe();
    } catch (ex) {}
    this.settings.matomo_analytics = false;
    this.settings.matomo_analytics_last_question = moment().unix();
    await this.uiSettingsStorage.saveSettings(this.settings);
    this.uiAnalytics.disableTracking();
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      AnalyticsPopoverComponent.POPOVER_ID,
    );
  }

  public async finish() {
    try {
      this.disableHardwareBack.unsubscribe();
    } catch (ex) {}
    this.settings.matomo_analytics = true;
    this.settings.matomo_analytics_last_question = moment().unix();
    await this.uiSettingsStorage.saveSettings(this.settings);
    this.uiAnalytics.enableTracking();
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      AnalyticsPopoverComponent.POPOVER_ID,
    );
  }
}
