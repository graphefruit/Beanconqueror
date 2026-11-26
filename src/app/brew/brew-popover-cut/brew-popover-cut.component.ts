import { DecimalPipe } from '@angular/common';
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
  linkedSignal,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import {
  IonBadge,
  IonButton,
  IonCard,
  IonCol,
  IonContent,
  IonFooter,
  IonHeader,
  IonItem,
  IonLabel,
  IonRange,
  IonRow,
  ModalController,
} from '@ionic/angular';
import type { RangeCustomEvent } from '@ionic/angular';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Brew } from 'src/classes/brew/brew';
import { BrewFlow } from 'src/classes/brew/brewFlow';
import { FlowSeriesBuffer } from '../../../components/brews/graph/flow-series-buffer';
import { CutMarkersPlugin } from '../../../components/brews/graph/overlays/cut-markers';
import { seriesDefsFor } from '../../../components/brews/graph/series-def';
import { UplotRenderer } from '../../../components/brews/graph/uplot-renderer';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import {
  RangeNameDirective,
  rangeValueText,
} from '../../../directive/range-name.directive';
import { ThemeService } from '../../../services/theme/theme.service';
import { UILog } from '../../../services/uiLog';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import {
  calculateCutBounds,
  cutPreviewWeight,
  FlowCutSave,
  performFlowCut,
} from '../../../stores/brews/flow-cut-rules';

const CHART_HEIGHT = 200;
/** An arrow key moves a knob by 0.1 s, PageUp/PageDown by 1 s; a finger keeps ms. */
export const CUT_KEY_STEP = 0.1;

interface CutRange {
  lower: number;
  upper: number;
}

@Component({
  selector: 'app-brew-popover-cut',
  templateUrl: './brew-popover-cut.component.html',
  styleUrls: ['./brew-popover-cut.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    TranslatePipe,
    IonHeader,
    IonContent,
    IonFooter,
    IonButton,
    IonRow,
    IonCol,
    IonItem,
    IonLabel,
    IonRange,
    RangeNameDirective,
    HeaderComponent,
    HeaderDismissButtonComponent,
    IonCard,
    IonBadge,
  ],
})
export class BrewPopoverCutComponent {
  private readonly modalController = inject(ModalController);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly theme = inject(ThemeService);
  private readonly translate = inject(TranslateService);
  private readonly uiLog = inject(UILog);

  public static COMPONENT_ID = 'brew-cut';
  protected readonly keyStep = CUT_KEY_STEP;
  protected readonly chartHeight = CHART_HEIGHT;

  public readonly brew = input.required<Brew>();
  public readonly flowProfile = input.required<BrewFlow>();

  private readonly chart = viewChild.required<ElementRef<HTMLElement>>('chart');

  public readonly maxTime = computed(() =>
    calculateCutBounds(this.flowProfile()),
  );
  public readonly cutRange = linkedSignal<CutRange>(() => ({
    lower: 0,
    upper: this.maxTime(),
  }));
  public readonly newFinalWeight = computed(() =>
    cutPreviewWeight(this.flowProfile(), this.cutRange().upper),
  );
  public readonly duration = computed(
    () => this.cutRange().upper - this.cutRange().lower,
  );
  public readonly rightCut = computed(
    () => this.maxTime() - this.cutRange().upper,
  );
  public readonly saveDisabled = computed(
    () =>
      this.cutRange().lower === 0 && this.cutRange().upper === this.maxTime(),
  );
  /** Ionic draws two knobs wrong while the modal still moves in. */
  public readonly loaded = signal(false);

  /** What the knobs say after their value: the result of the cut. */
  public readonly cutSummary = (range: CutRange): string => {
    const language = this.translate.getCurrentLang() ?? 'en';
    return String(
      this.translate.instant('A11Y.CUT_RESULT', {
        duration: rangeValueText(
          range.upper - range.lower,
          0.01,
          's',
          language,
        ),
        weight: rangeValueText(
          cutPreviewWeight(this.flowProfile(), range.upper),
          0.01,
          'g',
          language,
        ),
      }),
    );
  };

  private readonly width = signal(0);
  private renderer: UplotRenderer | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    const loading = setTimeout(() => this.loaded.set(true), 50);
    afterNextRender(() => {
      const sizes = new ResizeObserver(([entry]) =>
        this.width.set(Math.floor(entry.contentRect.width)),
      );
      sizes.observe(this.chart().nativeElement);
      destroyRef.onDestroy(() => sizes.disconnect());
    });
    destroyRef.onDestroy(() => {
      clearTimeout(loading);
      this.renderer?.destroy();
      this.renderer = null;
    });

    effect(() => {
      const width = this.width();
      if (width <= 0) {
        return;
      }
      if (this.renderer) {
        this.renderer.resize(width, CHART_HEIGHT);
      } else {
        untracked(() => void this.draw(width));
      }
    });
    effect(() => {
      const dark = this.theme.dark();
      this.renderer?.setDark(dark);
    });
  }

  /** Draws the graph once; moving a knob only moves the cut markers. */
  private async draw(width: number): Promise<void> {
    const renderer = new UplotRenderer([new CutMarkersPlugin()]);
    this.renderer = renderer;
    const settings = this.uiSettingsStorage.getSettings();
    const buffer = new FlowSeriesBuffer();
    buffer.load(this.flowProfile());
    try {
      await renderer.mount(this.chart().nativeElement, {
        width,
        height: CHART_HEIGHT,
        dark: this.theme.dark(),
        mode: 'detail',
        axisSettings: settings,
        style: this.brew().getPreparation()?.style_type,
      });
    } catch (error) {
      // Without the chart library the knobs still cut; the brew is intact.
      this.uiLog.error('Cut graph could not be drawn', error);
      return;
    }
    // A resize while uPlot loaded went to the renderer before its mount.
    renderer.resize(this.width(), CHART_HEIGHT);
    renderer.setSeries(
      seriesDefsFor(buffer, 'live', settings.graph_colors, (key): string =>
        String(this.translate.instant(key)),
      ),
    );
    renderer.attach(buffer);
    // The knobs end at the last brew time, which may lie past the last timestamp.
    renderer.setViewport({
      mode: 'range',
      from: 0,
      to: Math.max(this.maxTime(), buffer.endTime()),
    });
    this.showCut();
  }

  private showCut(): void {
    const { lower, upper } = this.cutRange();
    this.renderer?.setCutMarkers([lower, upper]);
  }

  public onRangeInput(event: Event): void {
    const value = (event as RangeCustomEvent).detail.value;
    if (typeof value === 'object') {
      this.cutRange.set({ lower: value.lower, upper: value.upper });
      this.showCut();
    }
  }

  public save(): void {
    const { lower, upper } = this.cutRange();
    const duration = upper - lower;
    const cut: FlowCutSave = {
      ...performFlowCut(this.flowProfile(), lower, upper, this.brew()),
      brew_time: Math.round(duration),
      brew_time_milliseconds: Math.round(duration * 1000),
    };
    void this.modalController.dismiss(
      cut,
      'save',
      BrewPopoverCutComponent.COMPONENT_ID,
    );
  }

  public dismiss(): void {
    void this.modalController.dismiss(
      undefined,
      'cancel',
      BrewPopoverCutComponent.COMPONENT_ID,
    );
  }
}
