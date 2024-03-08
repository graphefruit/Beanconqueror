import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { Settings } from '../../classes/settings/settings';
import { UIBeanHelper } from '../../services/uiBeanHelper';
import { UIMillHelper } from '../../services/uiMillHelper';
import { UIPreparationHelper } from '../../services/uiPreparationHelper';
@Component({
  selector: 'welcome-popover',
  templateUrl: './welcome-popover.component.html',
  styleUrls: ['./welcome-popover.component.scss'],
})
export class WelcomePopoverComponent implements OnInit {
  public slideOpts = {
    allowTouchMove: false,
    speed: 400,
    slide: 4,
  };

  public slide: number = 1;
  @ViewChild('slider', { static: false }) public welcomeSlider:
    | ElementRef
    | undefined;

  private settings: Settings;

  private disableHardwareBack;
  constructor(
    private readonly modalController: ModalController,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly platform: Platform,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly uiMillHelper: UIMillHelper,
    private readonly uiPreparationHelper: UIPreparationHelper
  ) {}

  public ngOnInit() {
    try {
      setTimeout(() => {
        try {
          /** Somehow on android device, the swiper scrolled to the latest tile, and didn't show the first one.
          This was repeatable on google pixel 4a5g, but not on pixel 2XL, and more funny,
           this was just repeatable on a production build app **/
          this.welcomeSlider?.nativeElement.swiper.slideTo(0);
          this.welcomeSlider?.nativeElement.swiper.pagination.update(true);
        } catch (ex) {}
      }, 500);
      this.settings = this.uiSettingsStorage.getSettings();
      this.disableHardwareBack = this.platform.backButton.subscribeWithPriority(
        9999,
        (processNextHandler) => {
          // Don't do anything.
        }
      );
    } catch (ex) {}
  }

  public async dontActivateAnalytics() {
    this.settings.matomo_analytics = false;
    this.uiAnalytics.disableTracking();
    await this.uiSettingsStorage.saveSettings(this.settings);
    this.slide++;
    this.welcomeSlider?.nativeElement.swiper.slideNext();
  }

  public async understoodAnalytics() {
    this.settings.matomo_analytics = true;
    this.uiAnalytics.enableTracking();
    await this.uiSettingsStorage.saveSettings(this.settings);
    this.slide++;
    this.welcomeSlider?.nativeElement.swiper.slideNext();
  }

  public async skip() {
    this.slide++;
    this.welcomeSlider?.nativeElement.swiper.slideNext();
  }

  public next() {
    setTimeout(() => {
      this.slide++;
      this.welcomeSlider?.nativeElement.swiper.slideNext();
    }, 500);
  }

  public async addBean() {
    await this.uiBeanHelper.addBean(true);
    this.next();
  }

  public async addPreparation() {
    await this.uiPreparationHelper.addPreparation(true);
    this.next();
  }

  public async addMill() {
    await this.uiMillHelper.addMill(true);
    this.next();
  }

  public async finish() {
    try {
      this.disableHardwareBack.unsubscribe();
    } catch (ex) {}
    this.settings.welcome_page_showed = true;
    await this.uiSettingsStorage.saveSettings(this.settings);
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      'welcome-popover'
    );
  }
}
