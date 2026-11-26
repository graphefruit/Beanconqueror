import { DecimalPipe } from '@angular/common';
import {
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

import { IonBadge, IonChip, IonItem, IonLabel, IonRange } from '@ionic/angular';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import type { BrewFlow } from '../../../../classes/brew/brewFlow';
import { ChipButtonDirective } from '../../../../directive/chip-button.directive';
import { RangeNameDirective } from '../../../../directive/range-name.directive';
import { ThemeService } from '../../../../services/theme/theme.service';
import { UILog } from '../../../../services/uiLog';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { FlowSeriesBuffer } from '../flow-series-buffer';
import { describeCursor, describeFlowGraph } from '../graph-text-alternative';
import { CursorLabelsPlugin } from '../overlays/cursor-labels';
import {
  initiallyVisible,
  isCustomId,
  seriesColour,
  seriesDefsFor,
  type SeriesDef,
  type SeriesId,
  type Translate,
} from '../series-def';
import { UplotRenderer } from '../uplot-renderer';

/** Seconds PageUp and PageDown move the time slider; an arrow key moves it 0.1 s. */
export const PAGE_STEP_SEC = 5;

export interface SeriesChip {
  id: SeriesId;
  label: string;
  colour: string;
  visible: boolean;
  custom: boolean;
}

/** The series of a saved brew, or null when it has nothing to draw. */
function bufferOf(flow: BrewFlow | null): FlowSeriesBuffer | null {
  const buffer = new FlowSeriesBuffer();
  return flow && buffer.load(flow).hasGraph ? buffer : null;
}

function tenths(sec: number): number {
  return Math.round(sec * 10) / 10;
}

/**
 * The large graph of a saved brew: every series with data on fitted axes, a
 * reference brew underneath, a chip per series to show or hide it with its
 * reference, and a time slider whose values the graph labels at the cursor
 * and the slider says to a screen reader. Content given to it sits at the end
 * of the chip row, e.g. a close button.
 */
@Component({
  selector: 'app-brew-graph-view',
  templateUrl: './brew-graph-view.component.html',
  styleUrls: ['./brew-graph-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    TranslatePipe,
    IonBadge,
    IonChip,
    IonItem,
    IonLabel,
    IonRange,
    ChipButtonDirective,
    RangeNameDirective,
  ],
})
export class BrewGraphViewComponent {
  private readonly translate = inject(TranslateService);
  private readonly theme = inject(ThemeService);
  private readonly uiLog = inject(UILog);
  private readonly uiSettingsStorage = inject(UISettingsStorage);

  public readonly flow = input<BrewFlow | null>(null);
  public readonly reference = input<BrewFlow | null>(null);

  private readonly chart = viewChild.required<ElementRef<HTMLElement>>('chart');

  protected readonly live = computed(() => bufferOf(this.flow()));
  private readonly ref = computed(() => bufferOf(this.reference()));
  private readonly defs = computed<SeriesDef[]>(() => {
    const live = this.live();
    if (!live) {
      return [];
    }
    const colors = this.uiSettingsStorage.getSettings().graph_colors;
    const translate: Translate = (key) => String(this.translate.instant(key));
    const ref = this.ref();
    return [
      ...seriesDefsFor(live, 'live', colors, translate),
      ...(ref ? seriesDefsFor(ref, 'reference', colors, translate) : []),
    ];
  });
  private readonly hidden = linkedSignal<SeriesDef[], ReadonlySet<SeriesId>>({
    source: this.defs,
    computation: (defs) =>
      new Set(defs.filter((d) => !initiallyVisible(d, null)).map((d) => d.id)),
  });
  private readonly shownLive = computed(() => {
    const hidden = this.hidden();
    return this.defs().filter((d) => d.kind === 'live' && !hidden.has(d.id));
  });

  protected readonly chips = computed<SeriesChip[]>(() => {
    const dark = this.theme.dark();
    const hidden = this.hidden();
    return this.defs()
      .filter((d) => d.kind === 'live')
      .map((d) => ({
        id: d.id,
        label: d.label,
        colour: seriesColour(d, dark),
        visible: !hidden.has(d.id),
        custom: isCustomId(d.id),
      }));
  });
  protected readonly end = computed(() =>
    tenths(Math.max(this.live()?.endTime() ?? 0, this.ref()?.endTime() ?? 0)),
  );
  protected readonly cursor = linkedSignal({
    source: this.live,
    computation: () => 0,
  });
  protected readonly description = computed(() => {
    const live = this.live();
    const title = String(this.translate.instant('A11Y.FLOW_PROFILE_GRAPH'));
    return live
      ? describeFlowGraph(
          title,
          live,
          this.shownLive(),
          this.language(),
          (key, params) => String(this.translate.instant(key, params)),
        )
      : title;
  });
  /** The words of the slider: the time and what the graph shows at it. */
  protected readonly valueText = computed(() => {
    const live = this.live();
    const shown = this.shownLive();
    const language = this.language();
    return (time: number): string =>
      live ? describeCursor(time, live, shown, language) : '';
  });

  private readonly size = signal({ width: 0, height: 0 });
  private readonly ready = signal(false);
  private renderer: UplotRenderer | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    effect((onCleanup) => {
      const el = this.chart().nativeElement;
      const sizes = new ResizeObserver(([entry]) =>
        this.size.set({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        }),
      );
      sizes.observe(el);
      onCleanup(() => sizes.disconnect());
    });
    destroyRef.onDestroy(() => {
      this.renderer?.destroy();
      this.renderer = null;
    });

    effect(() => {
      const { width, height } = this.size();
      if (width > 0 && height > 0 && this.live() && !this.renderer) {
        untracked(() => void this.mount());
      }
    });
    effect(() => {
      const defs = this.defs();
      const live = this.live();
      const ref = this.ref();
      if (this.ready() && live) {
        this.renderer.setSeries(defs);
        this.renderer.attach(live);
        this.renderer.setReferences(ref);
      }
    });
    effect(() => {
      const hidden = this.hidden();
      if (this.ready()) {
        for (const def of this.defs()) {
          this.renderer.setVisible(def.id, !hidden.has(def.id));
        }
      }
    });
    effect(() => {
      const cursor = this.cursor();
      if (this.ready()) {
        this.renderer.setCursor(cursor);
      }
    });
    effect(() => {
      const dark = this.theme.dark();
      if (this.ready()) {
        this.renderer.setDark(dark);
      }
    });
    effect(() => {
      const { width, height } = this.size();
      if (this.ready()) {
        this.renderer.resize(width, height);
      }
    });
  }

  protected toggle(id: SeriesId): void {
    this.hidden.update((hidden) => {
      const next = new Set(hidden);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  }

  protected onSlide(event: CustomEvent<{ value: unknown }>): void {
    const value = Number(event.detail.value);
    if (Number.isFinite(value)) {
      this.cursor.set(value);
    }
  }

  /** PageUp and PageDown move the slider by whole steps of PAGE_STEP_SEC. */
  protected onPage(event: Event, direction: 1 | -1): void {
    event.preventDefault();
    const next = this.cursor() + direction * PAGE_STEP_SEC;
    this.cursor.set(tenths(Math.min(this.end(), Math.max(0, next))));
  }

  private language(): string {
    return this.translate.getCurrentLang() ?? 'en';
  }

  private async mount(): Promise<void> {
    const renderer = new UplotRenderer([
      new CursorLabelsPlugin({
        // A drag on the graph moves the slider too, in its steps.
        onCursorDrag: (t) => this.cursor.set(tenths(t)),
      }),
    ]);
    this.renderer = renderer;
    try {
      await renderer.mount(this.chart().nativeElement, {
        ...this.size(),
        dark: this.theme.dark(),
        mode: 'detail',
        axisSettings: this.uiSettingsStorage.getSettings(),
      });
      if (this.renderer === renderer) {
        this.ready.set(true);
      }
    } catch (error) {
      // Without the chart library the graph stays empty; the brew is intact.
      this.uiLog.error('Graph could not be drawn', error);
      if (this.renderer === renderer) {
        this.renderer = null;
      }
    }
  }
}
