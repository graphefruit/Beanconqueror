import { Component, OnInit } from '@angular/core';
import { Settings } from '../../classes/settings/settings';
import { ModalController, Platform } from '@ionic/angular';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIAnalytics } from '../../services/uiAnalytics';
import moment from 'moment/moment';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIAlert } from '../../services/uiAlert';

@Component({
  selector: 'app-please-activate-analytics-popover',
  templateUrl: './please-activate-analytics-popover.component.html',
  styleUrls: ['./please-activate-analytics-popover.component.scss'],
})
export class PleaseActivateAnalyticsPopoverComponent implements OnInit {
  public static POPOVER_ID: string = 'please-activate-analytics-popover';
  private readonly settings: Settings;

  private disableHardwareBack;
  public finishButtonDisabled: boolean = true;
  public delayCounter: number = 20;
  public brewsCount: number = 0;
  public beansCount: number = 0;
  constructor(
    private readonly modalController: ModalController,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly platform: Platform,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiAlert: UIAlert,
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
    this.beansCount = this.uiBeanStorage.getAllEntries().length;
    this.brewsCount = this.uiBrewStorage.getAllEntries().length;
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

  public async dontActivateAnalytics() {
    await this.uiAlert.showLoadingSpinner();
    this.settings.matomo_analytics = false;
    this.uiAnalytics.disableTracking();
    await this.uiSettingsStorage.saveSettings(this.settings);
    this.uiAlert.hideLoadingSpinner();
    this.finish();
  }

  public async understoodAnalytics() {
    await this.uiAlert.showLoadingSpinner();
    await this.uiAnalytics.enableTracking();
    /**Enable link tracking will generate a new tracking id, thats why we need to get the settings here again and set the matomo analtics to true**/
    const tmpSettings = this.uiSettingsStorage.getSettings();
    tmpSettings.matomo_analytics = true;
    await this.uiSettingsStorage.saveSettings(tmpSettings);
    this.uiAlert.hideLoadingSpinner();
    this.finish();
  }

  public async finish() {
    try {
      this.disableHardwareBack.unsubscribe();
    } catch (ex) {}

    this.settings.matomo_analytics_last_question = moment().unix();
    await this.uiSettingsStorage.saveSettings(this.settings);

    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      PleaseActivateAnalyticsPopoverComponent.POPOVER_ID,
    );
  }
}
