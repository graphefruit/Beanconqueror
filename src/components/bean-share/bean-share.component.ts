import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  LOCALE_ID,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';

import {
  IonButton,
  IonContent,
  IonFooter,
  IonHeader,
  IonToggle,
  ModalController,
} from '@ionic/angular';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { IBean } from '../../interfaces/bean/iBean';
import { FormatDatePipe } from '../../pipes/formatDate';
import { ShareService } from '../../services/shareService/share-service.service';
import { ThemeService } from '../../services/theme/theme.service';
import { UIAlert } from '../../services/uiAlert';
import { UIFileHelper } from '../../services/uiFileHelper';
import { UILog } from '../../services/uiLog';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import {
  beanShareCard,
  beanSharePhotoSrc,
  describeBeanShareCard,
  shownBeanShareRows,
} from '../../stores/beans/bean-share-card-rules';
import { BeanUsage } from '../../stores/beans/bean-usage.store';
import { DeepReadonly } from '../../stores/core/read-only';
import { SHARE_IMAGE_WIDTH } from '../brew-share/brew-share.component';
import {
  initialSharePalette,
  SHARE_PALETTES,
  SharePalette,
} from '../brew-share/share-palettes';
import { HeaderDismissButtonComponent } from '../header/header-dismiss-button.component';
import { HeaderComponent } from '../header/header.component';

/**
 * Shows the picture of a bean before it is shared: the bean card as the app
 * shows it, in a colour of choice and with or without the notes and photo. As with the
 * brew, the picture is drawn from the preview and holds no Ionic components.
 */
@Component({
  selector: 'app-bean-share',
  templateUrl: './bean-share.component.html',
  styleUrls: [
    '../brew-share/brew-share.component.scss',
    './bean-share.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    IonHeader,
    IonContent,
    IonFooter,
    IonButton,
    IonToggle,
    HeaderComponent,
    HeaderDismissButtonComponent,
  ],
})
export class BeanShareComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly translate = inject(TranslateService);
  private readonly settingsStorage = inject(UISettingsStorage);
  private readonly shareService = inject(ShareService);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly uiLog = inject(UILog);
  private readonly decimal = new DecimalPipe(inject(LOCALE_ID));
  private readonly formatDate = new FormatDatePipe();
  private readonly t = (key: string, params?: object): string =>
    this.translate.instant(key, params) as string;

  public readonly bean = input.required<DeepReadonly<IBean>>();
  public readonly usage = input.required<BeanUsage>();

  protected readonly palettes = SHARE_PALETTES;
  protected readonly palette = signal<SharePalette>(
    initialSharePalette(inject(ThemeService).isDarkMode()),
  );
  protected readonly showNote = signal(false);
  /** The photo, once it is read and can be drawn; until then not offered. */
  protected readonly photoSrc = signal<string | undefined>(undefined);
  protected readonly showPhoto = signal(false);
  protected readonly photoShown = computed(
    () => this.showPhoto() && !!this.photoSrc(),
  );
  protected readonly busy = signal(false);

  protected readonly card = computed(() => {
    const settings = this.settingsStorage.getSettings();
    return beanShareCard({
      bean: this.bean(),
      listParameters: settings.bean_visible_list_view_parameters,
      customRating:
        Number(settings.bean_rating) !== 5 ||
        Number(settings.bean_rating_steps) !== 1,
      usage: this.usage(),
      now: Date.now(),
      formatDate: (date) =>
        this.formatDate.transform(date, [settings.date_format]) as string,
      formatNumber: (value) => this.decimal.transform(value, '.0-2') ?? '',
      t: this.t,
    });
  });
  protected readonly rows = computed(() =>
    shownBeanShareRows(this.card(), this.showNote()),
  );
  protected readonly description = computed(() =>
    describeBeanShareCard(
      this.card(),
      { note: this.showNote(), photo: this.photoShown() },
      this.t,
    ),
  );

  private readonly picture =
    viewChild.required<ElementRef<HTMLElement>>('picture');

  public static async open(
    modalController: ModalController,
    bean: DeepReadonly<IBean>,
    usage: BeanUsage,
  ): Promise<void> {
    const modal = await modalController.create({
      component: BeanShareComponent,
      componentProps: { bean, usage },
      id: 'bean-share',
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public ngOnInit(): void {
    this.showNote.set(this.card().noteShown);
    void this.loadPhoto();
  }

  /** A photo that is missing or cannot be drawn leaves the switch away. */
  private async loadPhoto(): Promise<void> {
    const path = this.card().photo;
    if (!path) {
      return;
    }
    try {
      const src = path.startsWith('http')
        ? path
        : beanSharePhotoSrc(
            path,
            await this.uiFileHelper.readInternalFileAsBase64(path),
          );
      const image = new Image();
      image.src = src;
      await image.decode();
      this.photoSrc.set(src);
    } catch (error) {
      this.uiLog.error('Share - could not read the photo of the bean', error);
    }
  }

  protected async share(): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      const shared = await this.shareService.shareElementAsImage(
        this.picture().nativeElement,
        SHARE_IMAGE_WIDTH,
      );
      if (!shared) {
        await this.uiAlert.showMessage(
          'SHARE_CARD.FAILED',
          undefined,
          undefined,
          true,
        );
      }
    } finally {
      this.busy.set(false);
    }
  }

  protected async dismiss(): Promise<void> {
    await this.modalController.dismiss(undefined, 'cancel', 'bean-share');
  }
}
