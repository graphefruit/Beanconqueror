import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  Injector,
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
} from '@ionic/angular';

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
  changeDetection: ChangeDetectionStrategy.Eager,
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
  private readonly injector = inject(Injector);
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  public slide: number = 1;
  @ViewChild('slider', { static: false }) public welcomeSlider:
    ElementRef | undefined;

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
    this.showNextStep();
  }

  public async understoodAnalytics() {
    this.settings.matomo_analytics = true;
    this.uiAnalytics.enableTracking();
    await this.uiSettingsStorage.saveSettings(this.settings);
    this.showNextStep();
  }

  public async skip() {
    this.showNextStep();
  }

  /**
   * Leads on once the form of the step has closed: until then Ionic keeps the
   * focus in the form, and afterwards it hands the focus back to the button
   * that opened it, which is hidden once the next step shows.
   */
  private async next(): Promise<void> {
    const form = await this.modalController.getTop();
    if (form && form !== this.host.closest('ion-modal')) {
      await form.onDidDismiss();
    }
    this.showNextStep();
  }

  /**
   * The button that led on is in a step that is hidden now, so the focus
   * moves to the heading of the next step.
   */
  private showNextStep(): void {
    this.slide++;
    this.welcomeSlider?.nativeElement.swiper.slideNext();
    afterNextRender(
      () =>
        this.host
          .querySelector<HTMLElement>(
            'swiper-slide:not([inert]) [role="heading"]',
          )
          ?.focus({ preventScroll: true }),
      { injector: this.injector },
    );
  }

  public async addBean() {
    await this.uiBeanHelper.addBean(true);
    await this.next();
  }

  public async addPreparation() {
    await this.uiPreparationHelper.addPreparation(true);
    await this.next();
  }

  public async addMill() {
    await this.uiMillHelper.addMill(true);
    await this.next();
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
