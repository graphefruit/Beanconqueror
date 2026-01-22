import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';

import {
  IonButton,
  IonCol,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonRow,
  IonTitle,
  ModalController,
  Platform,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { Settings } from '../../classes/settings/settings';
import { ThemeService } from '../../services/theme/theme.service';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIBeanHelper } from '../../services/uiBeanHelper';
import { UIMillHelper } from '../../services/uiMillHelper';
import { UIPreparationHelper } from '../../services/uiPreparationHelper';
import { UISettingsStorage } from '../../services/uiSettingsStorage';

@Component({
  selector: 'welcome-popover',
  templateUrl: './welcome-popover.component.html',
  styleUrls: ['./welcome-popover.component.scss'],
  imports: [
    TranslatePipe,
    IonHeader,
    IonTitle,
    IonContent,
    IonIcon,
    IonFooter,
    IonRow,
    IonCol,
    IonButton,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class WelcomePopoverComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly platform = inject(Platform);
  private readonly uiBeanHelper = inject(UIBeanHelper);
  private readonly uiMillHelper = inject(UIMillHelper);
  private readonly uiPreparationHelper = inject(UIPreparationHelper);
  private readonly themeService = inject(ThemeService);

  public slide: number = 1;
  @ViewChild('slider', { static: false }) public welcomeSlider:
    | ElementRef
    | undefined;

  private settings: Settings;

  private disableHardwareBack;

  public ngOnInit() {
    this.themeService.setLightMode();
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
        },
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
      'welcome-popover',
    );
  }
}
