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

import { Brew } from '../../classes/brew/brew';
import { FormatDatePipe } from '../../pipes/formatDate';
import { GraphHelperService } from '../../services/graphHelper/graph-helper.service';
import { ShareService } from '../../services/shareService/share-service.service';
import { ThemeService } from '../../services/theme/theme.service';
import { UIAlert } from '../../services/uiAlert';
import { UILog } from '../../services/uiLog';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import {
  brewShareCard,
  BrewShareSource,
  describeBrewShareCard,
} from '../../stores/brews/brew-share-card-rules';
import { HeaderDismissButtonComponent } from '../header/header-dismiss-button.component';
import { HeaderComponent } from '../header/header.component';
import { GRAPH_INK, SHARE_PALETTES, SharePalette } from './share-palettes';

/** Width of the shared picture; 4:5 gives 1080 × 1350, as feeds show it. */
export const SHARE_IMAGE_WIDTH = 1080;
/** Size of the graph on the card, in CSS pixels; it is drawn three times as big. */
const GRAPH_WIDTH = 300;
const GRAPH_HEIGHT = 150;

/**
 * Shows the picture of a brew before it is shared: the brew card as the app
 * shows it, the graph below it when there is one, in a colour of choice and
 * with or without the notes. The picture is drawn from the preview itself, so
 * what is seen is what is shared. It holds no Ionic components: their shadow
 * DOM does not come out in the picture.
 */
@Component({
  selector: 'brew-share',
  templateUrl: './brew-share.component.html',
  styleUrls: ['./brew-share.component.scss'],
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
export class BrewShareComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly translate = inject(TranslateService);
  private readonly settingsStorage = inject(UISettingsStorage);
  private readonly graphHelper = inject(GraphHelperService);
  private readonly shareService = inject(ShareService);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiLog = inject(UILog);
  private readonly decimal = new DecimalPipe(inject(LOCALE_ID));
  private readonly formatDate = new FormatDatePipe();

  public readonly brew = input.required<Brew>();

  protected readonly palettes = SHARE_PALETTES;
  // The app's mode picks the first colour; the picture does not follow it later.
  protected readonly palette = signal<SharePalette>(
    SHARE_PALETTES.find(
      (palette) =>
        palette.id ===
        (inject(ThemeService).isDarkMode() ? 'espresso' : 'caramel'),
    ),
  );
  protected readonly showNote = signal(false);
  protected readonly graph = signal<string | undefined>(undefined);
  protected readonly graphFailed = signal(false);
  // Until the graph is in, a picture shared would silently lack it.
  private readonly drawing = signal(true);
  private readonly sharing = signal(false);
  // Kept apart, so the end of one does not free the button while the other runs.
  protected readonly busy = computed(() => this.drawing() || this.sharing());

  protected readonly card = computed(() =>
    brewShareCard(this.source(this.brew())),
  );
  protected readonly description = computed(() =>
    describeBrewShareCard(
      this.card(),
      { note: this.showNote(), graph: this.graph() !== undefined },
      (key, params) => this.translate.instant(key, params) as string,
    ),
  );
  protected readonly icon = computed(
    () =>
      `url(assets/custom-ion-icons/${this.brew().getPreparation().getIcon()}.svg)`,
  );

  private readonly picture =
    viewChild.required<ElementRef<HTMLElement>>('picture');
  /** The mode of the graph last asked for; only its answer is shown. */
  private graphMode?: SharePalette['graph'];

  public static async open(
    modalController: ModalController,
    brew: Brew,
  ): Promise<void> {
    const modal = await modalController.create({
      component: BrewShareComponent,
      componentProps: { brew },
      id: 'brew-share',
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public ngOnInit(): void {
    this.showNote.set(this.card().noteShown);
    void this.loadGraph();
  }

  protected choose(palette: SharePalette): void {
    this.palette.set(palette);
    void this.loadGraph();
  }

  private async loadGraph(): Promise<void> {
    const mode = this.palette().graph;
    if (mode === this.graphMode) {
      return;
    }
    this.graphMode = mode;
    this.drawing.set(true);
    const latest = () => mode === this.graphMode;
    try {
      const image = await this.graphHelper.brewGraphImage(
        this.brew(),
        GRAPH_WIDTH,
        GRAPH_HEIGHT,
        { dark: mode === 'dark', ink: GRAPH_INK[mode] },
      );
      if (latest()) {
        this.graph.set(image);
        this.graphFailed.set(false);
      }
    } catch (error) {
      // The picture is still worth sharing without the graph.
      this.uiLog.error('Share - could not draw the graph', error);
      if (latest()) {
        this.graph.set(undefined);
        this.graphFailed.set(true);
      }
    } finally {
      if (latest()) {
        this.drawing.set(false);
      }
    }
  }

  protected async share(): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.sharing.set(true);
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
      this.sharing.set(false);
    }
  }

  protected async dismiss(): Promise<void> {
    await this.modalController.dismiss(undefined, 'cancel', 'brew-share');
  }

  private source(brew: Brew): BrewShareSource {
    const settings = this.settingsStorage.getSettings();
    // As the brew card's pipe: a value the brew cannot work out, e.g. with
    // its water gone, stays empty instead of breaking the picture.
    const text = (read: () => string | number | undefined): string => {
      try {
        const value = read();
        return value === undefined || value === null ? '' : String(value);
      } catch {
        return '';
      }
    };
    const timestamp = brew.config.unix_timestamp;
    return {
      brew,
      bean: brew.getBean(),
      preparation: brew.getPreparation(),
      millName: text(() => brew.getMill().name),
      listParameters: settings.visible_list_view_parameters,
      customRating:
        Number(settings.brew_rating) !== 5 ||
        Number(settings.brew_rating_steps) !== 1,
      texts: {
        date: this.formatDate.transform(timestamp, [settings.date_format]),
        time: this.formatDate.transform(timestamp, ['HH:mm']),
        ratio: text(() => brew.getBrewRatio()),
        brewTime: text(() => brew.getFormattedTotalCoffeeBrewTime()),
        extractionYield: text(() => brew.getExtractionYield()),
        temperatureTime: text(() =>
          brew.getFormattedTotalCoffeeTemperatureTime(),
        ),
        bloomingTime: text(() => brew.getFormattedTotalCoffeeBloomingTime()),
        firstDripTime: text(() => brew.getFormattedTotalCoffeeFirstDripTime()),
        water: text(() => brew.getWater().name),
        beanAge: text(() => brew.getCalculatedBeanAge()),
        tools: brew.method_of_preparation_tools.map((uuid) =>
          text(() => brew.getPreparationToolName(uuid)),
        ),
        flavors: [
          ...brew.cupped_flavor.custom_flavors,
          ...Object.keys(brew.cupped_flavor.predefined_flavors).map(
            (key) => this.translate.instant('CUPPING_' + key) as string,
          ),
        ],
      },
      formatNumber: (value) => this.decimal.transform(value, '.0-2') ?? '',
    };
  }
}
