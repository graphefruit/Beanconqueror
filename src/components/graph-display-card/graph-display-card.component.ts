import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { Platform } from '@ionic/angular';

import {
  HistoryDataPoint,
  HistoryListingEntry,
} from '@meticulous-home/espresso-api/dist/types';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { BrewFlow } from '../../classes/brew/brewFlow';
import { MeticulousDevice } from '../../classes/preparationDevice/meticulous/meticulousDevice';
import { ThemeService } from '../../services/theme/theme.service';
import { UIFileHelper } from '../../services/uiFileHelper';
import { UILog } from '../../services/uiLog';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { FlowSeriesBuffer } from '../brews/graph/flow-series-buffer';
import { seriesDefsFor } from '../brews/graph/series-def';
import { UplotRenderer } from '../brews/graph/uplot-renderer';

const DEFAULT_HEIGHT = 150;

/** A listing entry, whose shot data the card fetches when it is drawn. */
export type MeticulousEntry = Omit<HistoryListingEntry, 'data'> & {
  data: HistoryDataPoint[] | null;
};

interface FlowSource {
  path: string | undefined;
  data: BrewFlow | undefined;
  meticulous: MeticulousEntry | undefined;
  meticulousDevice: MeticulousDevice | undefined;
  machine: BrewFlow | undefined;
}

/**
 * The small, static graph of a brew in lists and previews. It reads its
 * flow profile and draws only once it is on screen with a width, so a list
 * of thousands of brews (graph on the second swiper slide) costs nothing
 * until a graph is looked at.
 */
@Component({
  selector: 'graph-display-card',
  templateUrl: './graph-display-card.component.html',
  styleUrls: ['./graph-display-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
})
export class GraphDisplayCardComponent {
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly uiLog = inject(UILog);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly platform = inject(Platform);
  private readonly theme = inject(ThemeService);
  private readonly translate = inject(TranslateService);

  public readonly flowProfileData = input<BrewFlow>();
  public readonly flowProfilePath = input<string>();
  public readonly meticulousHistoryData = input<MeticulousEntry>();
  public readonly meticulousDevice = input<MeticulousDevice>();
  public readonly gaggiuinoHistoryData = input<BrewFlow>();
  public readonly gaggimateHistoryData = input<BrewFlow>();
  public readonly chartHeight = input<number>();

  public readonly height = computed(() => {
    const height = this.chartHeight();
    return height > 0 ? height : DEFAULT_HEIGHT;
  });

  private readonly chart = viewChild.required<ElementRef<HTMLElement>>('chart');

  private readonly onScreen = signal(false);
  private readonly width = signal(0);
  private readonly drawable = computed(
    () => this.onScreen() && this.width() > 0,
  );
  private readonly source = computed<FlowSource>(() => ({
    path: this.flowProfilePath(),
    data: this.flowProfileData(),
    meticulous: this.meticulousHistoryData(),
    meticulousDevice: this.meticulousDevice(),
    machine: this.gaggiuinoHistoryData() ?? this.gaggimateHistoryData(),
  }));

  private renderer: UplotRenderer | null = null;
  private mounted: Promise<void> | null = null;
  /** Number of the latest draw; an older one that finishes later is dropped. */
  private draws = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const el = this.chart().nativeElement;
      const sizes = new ResizeObserver(([entry]) =>
        this.width.set(Math.floor(entry.contentRect.width)),
      );
      sizes.observe(el);
      const sight = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.onScreen.set(true);
          sight.disconnect();
        }
      });
      sight.observe(el);
      destroyRef.onDestroy(() => {
        sizes.disconnect();
        sight.disconnect();
      });
    });
    destroyRef.onDestroy(() => {
      this.draws++;
      this.renderer?.destroy();
      this.renderer = null;
    });

    effect(() => {
      const source = this.source();
      if (this.drawable()) {
        untracked(() => void this.draw(source));
      }
    });
    effect(() => {
      const width = this.width();
      const height = this.height();
      if (width > 0) {
        this.renderer?.resize(width, height);
      }
    });
    effect(() => {
      const dark = this.theme.dark();
      this.renderer?.setDark(dark);
    });
  }

  private async draw(source: FlowSource): Promise<void> {
    const draw = ++this.draws;
    const flow = await this.readFlow(source);
    if (draw !== this.draws) {
      return;
    }
    const buffer = new FlowSeriesBuffer();
    const hasGraph = buffer.load(flow).hasGraph;
    if (!hasGraph && !this.renderer) {
      return;
    }
    try {
      const renderer = await this.mount();
      if (draw !== this.draws) {
        return;
      }
      renderer.setSeries(
        hasGraph
          ? seriesDefsFor(
              buffer,
              'live',
              this.uiSettingsStorage.getSettings().graph_colors,
              (key): string => String(this.translate.instant(key)),
            )
          : [],
      );
      renderer.attach(buffer);
    } catch (error) {
      // Without the chart library the card stays empty; the brew is intact.
      this.uiLog.error('Graph card could not be drawn', error);
    }
  }

  private async mount(): Promise<UplotRenderer> {
    if (!this.renderer) {
      const renderer = new UplotRenderer();
      this.renderer = renderer;
      this.mounted = renderer
        .mount(this.chart().nativeElement, {
          width: this.width(),
          height: this.height(),
          dark: this.theme.dark(),
          mode: 'static',
          axisSettings: this.uiSettingsStorage.getSettings(),
        })
        .catch((error: unknown) => {
          // The next draw loads the library again.
          if (this.renderer === renderer) {
            this.renderer = null;
          }
          throw error;
        });
    }
    const renderer = this.renderer;
    await this.mounted;
    return renderer;
  }

  private async readFlow(source: FlowSource): Promise<BrewFlow | null> {
    try {
      if (source.path) {
        return await this.readFlowProfile(source.path);
      }
      if (source.data) {
        return source.data;
      }
      if (source.meticulous) {
        await this.ensureMeticulousShotData(
          source.meticulous,
          source.meticulousDevice,
        );
        return source.meticulous.data
          ? MeticulousDevice.returnBrewFlowForShotData(source.meticulous.data)
          : null;
      }
      return source.machine ?? null;
    } catch (error) {
      this.uiLog.error('Graph card could not read the flow profile', error);
      return null;
    }
  }

  /**
   * History listing entries are loaded without their shot data for
   * performance. When a card is actually drawn we lazily fetch the detail
   * for its own entry and cache it back onto the entry (mutating in place, so
   * the owning list keeps a stable object reference and the virtual scroll is
   * not reset).
   */
  private async ensureMeticulousShotData(
    entry: MeticulousEntry,
    device: MeticulousDevice | undefined,
  ): Promise<void> {
    if (entry.data || !device) {
      return;
    }
    try {
      const details = await device.getHistoryEntryDetails(entry.id);
      if (details?.data) {
        entry.data = details.data;
      }
    } catch {
      // ignore - no graph is drawn
    }
  }

  private async readFlowProfile(path: string): Promise<BrewFlow> {
    if (!this.platform.is('capacitor')) {
      const dummyData = (
        await import('../../assets/BeanconquerorFlowTestDataFourth.json')
      ).default;
      return dummyData as unknown as BrewFlow;
    }
    return (await this.uiFileHelper.readInternalJSONFile(path)) as BrewFlow;
  }
}
