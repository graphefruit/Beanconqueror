import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  TemplateRef,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';

import { IonContent } from '@ionic/angular';

import {
  defaultRangeExtractor,
  elementScroll,
  injectVirtualizer,
  measureElement,
  observeElementOffset,
  observeElementRect,
} from '@tanstack/angular-virtual';

import { TabPanelDirective } from '../../directive/tab-panel.directive';
import { FOCUS_LOST_EVENT } from '../../services/a11y/page-focus.service';
import { UILog } from '../../services/uiLog';
import {
  anchorAt,
  anchorOffset,
  ListAnchor,
  reveal,
  RowKey,
  runAround,
  withIndexes,
} from './virtual-list-anchor';

/** What can take focus in a row. */
const FOCUSABLE =
  'a[href], button:not([inert]), input, select, textarea, [tabindex]:not([tabindex="-1"]), .ion-focusable:not([inert])';

/** A row by its key and the index it had, which is checked before use. */
interface KeptRow {
  readonly key: RowKey;
  readonly index: number;
}

export interface VirtualRowContext<T> {
  $implicit: T;
}

/**
 * The template of a row: `<ng-template [appVirtualRow]="items" let-item>`.
 * The items it is given only type `item`; the list renders its own.
 */
@Directive({ selector: 'ng-template[appVirtualRow]' })
export class VirtualRowDirective<T> {
  public readonly appVirtualRow = input.required<readonly T[]>();
  public readonly template =
    inject<TemplateRef<VirtualRowContext<T>>>(TemplateRef);

  public static ngTemplateContextGuard<T>(
    _directive: VirtualRowDirective<T>,
    context: unknown,
  ): context is VirtualRowContext<T> {
    return true;
  }
}

/**
 * A list inside an `ion-content` that renders only the rows near the screen.
 * The content scrolls; each row is measured as it is rendered and again
 * whenever its height changes (photos, groups opened, larger text), and the
 * heights are kept per key while the items are rebuilt. When the list gets
 * wider or narrower (device turned, split view), the heights are measured
 * anew and the row at the top stays there. On a page with a
 * floating add button the list ends with room for it, so the last row can be
 * read and tapped.
 *
 * Content inside the list is shown above the rows. The segments and the
 * search of a page belong in its `ion-header`, outside the content that
 * scrolls: a screen reader brings the element it moves to into the scrolling
 * part, and the head would cover it there. With a segment in the header, the
 * content and the rows are the panel of the selected tab. With the class
 * `card`, that panel is drawn as a card.
 */
@Component({
  selector: 'app-virtual-list',
  imports: [NgTemplateOutlet, TabPanelDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-virtual-list': '',
    '[class.clear-of-add-button]': 'clearOfAddButton()',
  },
  styles: `
    :host {
      display: block;
      /* The list keeps its place itself when a row above the screen changes
         its height; a browser that did so as well (Chrome, Safari from iOS
         27) would move the rows twice. */
      overflow-anchor: none;
    }
    :host(.clear-of-add-button) {
      /* 56px is the size of Ionic's floating button. */
      padding-bottom: calc(56px + 2 * var(--bq-space-4));
    }
    :host(.card) .panel {
      /* Ionic's card margin. */
      margin: 10px;
      overflow: clip;
      border: 1px solid var(--bq-border-card);
      border-radius: var(--bq-radius-card);
      background: var(--ion-card-background);
      color: var(--ion-text-color);
    }
    .sizer {
      position: relative;
      /* On iOS a correction waits while a finger or momentum moves the list,
         and the rows are drawn shifted by it meanwhile: at the top, the
         first rows lie above the list and would show over the content
         there. */
      overflow-y: clip;
    }
    .rows {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
    }
    .row {
      /* Keeps the margins of a card inside the measured height. */
      display: flow-root;
    }
    .row.apart {
      position: absolute;
      left: 0;
      width: 100%;
    }
  `,
  template: `
    <div appTabPanel class="panel">
      <ng-content />
      <div #sizer class="sizer" [style.height.px]="totalSize()">
        <!-- Only some rows are rendered: each tells screen readers its place
             in the whole list. -->
        <div
          class="rows"
          role="list"
          [style.transform]="rowsOffset()"
          (focusin)="keepFocusedRow($event)"
          (focusout)="focusedRow.set(null)"
        >
          @for (row of rows(); track row.key) {
            <div
              #row
              class="row"
              role="listitem"
              [class.apart]="row.top !== null"
              [style.top.px]="row.top"
              [attr.data-index]="row.index"
              [attr.aria-setsize]="items().length"
              [attr.aria-posinset]="row.index + 1"
            >
              <ng-container
                [ngTemplateOutlet]="rowTemplate().template"
                [ngTemplateOutletContext]="{ $implicit: row.item }"
              />
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class VirtualListComponent<T> {
  private readonly injector = inject(Injector);
  private readonly appRef = inject(ApplicationRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly uiLog = inject(UILog);

  public readonly items = input.required<readonly T[]>();
  public readonly itemKey = input.required<(item: T) => RowKey>();
  /**
   * The height of a row before it is measured. Measured rows keep their
   * height when it changes; `measure` forgets them.
   */
  public readonly estimateSize = input.required<number>();
  /** Whether a floating add button lies over the end of the list. */
  public readonly clearOfAddButton = input(true);
  /**
   * The last row has been rendered: to load more items. Once per number of
   * items, and again after the list was scrolled away from its end.
   */
  public readonly endReached = output<void>();

  protected readonly rowTemplate =
    contentChild.required<VirtualRowDirective<T>>(VirtualRowDirective);
  private readonly rowElements = viewChildren<ElementRef<HTMLElement>>('row');
  private readonly sizer = viewChild.required<ElementRef<HTMLElement>>('sizer');

  private readonly scroller = signal<HTMLElement | undefined>(undefined);
  /** Where the rows start in the scroller, below the content above them. */
  private readonly scrollMargin = signal(0);
  /** The row `scrollToKey` brings on the screen once the list is shown. */
  private keyToReveal: RowKey | null = null;
  /** The width of the scroller the rows were measured at; 0 before. */
  private measuredWidth = 0;
  /**
   * Where a touch on the list began whose end has not reached the list.
   * On iOS the virtualizer holds its scroll corrections until then and
   * draws the rows shifted by them. The end goes to this element; one taken
   * off meanwhile (a deleted row, content drawn anew) is no longer in the
   * list, and the rows would stay shifted: a gap or an overlap at the top.
   */
  private touchStart: EventTarget | null = null;
  /** Set while the ResizeObserver of the rows tells their new heights. */
  private observingRows = false;
  /** The row that holds the focus, null while the focus is elsewhere. */
  protected readonly focusedRow = signal<KeptRow | null>(null);
  /** The row that held the focus last, also while a dialog has it. */
  private lastFocusedRow: KeptRow | null = null;
  /** The rows on the screen when the list last stood still. */
  private readonly restingRows = signal<readonly KeptRow[]>([]);
  /**
   * A jump of the app (see `jumpTo`): `waiting` for its first scroll event,
   * then `moving` until the list rests. A rest reported before that event
   * belongs to an earlier scroll and does not end it.
   */
  private jump: 'none' | 'waiting' | 'moving' = 'none';
  /**
   * The rows that stay rendered when they leave the screen. Taken off, a
   * row would take the focus with it, and the next Tab or screen reader step
   * would start again at the top of the page. A screen reader (TalkBack,
   * VoiceOver) moves its own focus without telling the page, so the rows it
   * could be on, those on the screen before a scroll, stay until the next
   * scroll.
   */
  private readonly keptIndexes = computed(() => {
    const focused = this.focusedRow();
    const rows = focused
      ? [...this.restingRows(), focused]
      : this.restingRows();
    return rows
      .map((row) => this.indexOfRow(row))
      .filter((index) => index >= 0);
  });

  private readonly virtualizer = injectVirtualizer<HTMLElement, HTMLElement>(
    () => {
      const items = this.items();
      const key = this.itemKey();
      const size = this.estimateSize();
      const kept = this.keptIndexes();
      return {
        scrollElement: this.scroller(),
        count: items.length,
        getItemKey: (index) => key(items[index]),
        estimateSize: () => size,
        rangeExtractor: (range) =>
          withIndexes(defaultRangeExtractor(range), kept),
        // Only the ResizeObserver measures a row: when it is rendered, its
        // Ionic elements are not drawn yet and the row is far too low, so
        // many more rows would be rendered. A hidden page reports its rows
        // without height; they keep theirs.
        measureElement: (element, entry, instance) => {
          if (entry) {
            this.observeRows();
          }
          const measured = entry ? measureElement(element, entry, instance) : 0;
          return measured > 0
            ? measured
            : (instance.itemSizeCache.get(
                instance.options.getItemKey(instance.indexFromElement(element)),
              ) ?? size);
        },
        // A hidden page (another tab) has no height and reads as scrolled to
        // the top. The list keeps its rows and position meanwhile, so that
        // they need not be built and measured again when it is shown.
        observeElementRect: (instance, report) =>
          observeElementRect(instance, (rect) => {
            if (rect.height > 0) {
              // Rows change their height with the width; the keyboard
              // changes only the height of the screen.
              if (this.measuredWidth > 0 && rect.width !== this.measuredWidth) {
                this.measureAtNewWidth();
              }
              this.measuredWidth = rect.width;
              report(rect);
              if (this.keyToReveal !== null) {
                this.afterRender(() => this.revealKey());
              }
            }
          }),
        observeElementOffset: (instance, report) =>
          observeElementOffset(instance, (offset, isScrolling) => {
            if (instance.scrollElement?.clientHeight !== 0) {
              if (isScrolling && this.jump === 'waiting') {
                this.jump = 'moving';
              } else if (
                isScrolling &&
                !instance.isScrolling &&
                this.jump === 'none'
              ) {
                this.keepRowsAtRest(instance.range);
              }
              report(offset, isScrolling);
              if (!isScrolling) {
                if (this.jump === 'moving') {
                  this.jump = 'none';
                }
                this.endLostTouch(offset);
              }
            }
          }),
        // A correction for a row measured above the screen moves the
        // content by the change of its height. The virtualizer adds it to the
        // position of the last scroll event; a position written since (by
        // `revealFocus`, a width change or anyone else in this frame) would
        // be undone, so it is added to the current one.
        scrollToFn: (offset, options, instance) =>
          elementScroll(
            options.adjustments && instance.scrollElement
              ? instance.scrollElement.scrollTop
              : offset,
            options,
            instance,
          ),
        scrollMargin: this.scrollMargin(),
        // The measuring, the correction of the scroll position it causes
        // and the rendering of the rows all happen before the browser
        // paints; a frame between them shows the rows jump. Angular renders
        // in a microtask, or at once while the observer of the rows reports:
        // rows that appear then are observed from the next frame, rows that
        // appear in a microtask after it would be too late for this one.
        onChange: () => {
          if (this.observingRows) {
            this.appRef.tick();
          }
        },
      };
    },
  );

  /**
   * The rows on the screen and next to it follow one another from `start`;
   * kept rows lie apart from them once they have scrolled away from them.
   */
  private readonly layout = computed(() => {
    const count = this.items().length;
    const rows = this.virtualizer
      .getVirtualItems()
      .filter((row) => row.index < count);
    const { first, end } = runAround(
      rows.map((row) => row.index),
      this.virtualizer().range?.startIndex ?? -1,
    );
    const near = rows.slice(first, end);
    const start = (near[0] ?? rows[0])?.start ?? this.scrollMargin();
    return { rows, first, end, near, start };
  });
  protected readonly rows = computed(() => {
    const items = this.items();
    const { rows, first, end, start } = this.layout();
    return rows.map((row, i) => ({
      key: row.key,
      index: row.index,
      item: items[row.index],
      top: i < first || i >= end ? row.start - start : null,
    }));
  });
  /** The number of items while the last row is rendered, else 0. */
  private readonly endShown = computed(() => {
    const count = this.items().length;
    const last = this.layout().near.at(-1);
    return last && last.index >= count - 1 ? count : 0;
  });
  protected readonly totalSize = computed(() =>
    this.virtualizer.getTotalSize(),
  );
  protected readonly rowsOffset = computed(
    () => `translateY(${this.layout().start - this.scrollMargin()}px)`,
  );

  public constructor() {
    inject(IonContent)
      .getScrollElement()
      .then((element) => this.scroller.set(element))
      .catch((error: unknown) =>
        this.uiLog.error('Virtual list without scroll element', error),
      );

    afterRenderEffect(() => {
      // From the bottom up, as the observer reports new rows in the order
      // they are observed: once a row above the screen has moved the
      // content, each further row lays out all rows after it again first,
      // and the rows above the screen are the fewest.
      for (const row of [...this.rowElements()].reverse()) {
        this.virtualizer.measureElement(row.nativeElement);
      }
      // Rows taken off the screen are no longer observed: their size turns
      // to 0, which the observer could only report in the next frame.
      this.virtualizer.measureElement(null);
    });

    effect(() => {
      if (this.endShown() > 0) {
        untracked(() => this.endReached.emit());
      }
    });

    effect((onCleanup) => {
      const scroller = this.scroller();
      if (!scroller) {
        return;
      }
      const options = { capture: true, passive: true };
      const listeners = {
        touchstart: (event: Event) => (this.touchStart = event.target),
        touchend: () => (this.touchStart = null),
        touchcancel: () => (this.touchStart = null),
      };
      for (const [type, listener] of Object.entries(listeners)) {
        scroller.addEventListener(type, listener, options);
      }
      onCleanup(() => {
        for (const [type, listener] of Object.entries(listeners)) {
          scroller.removeEventListener(type, listener, options);
        }
      });
    });

    // A deleted row takes the focus with it, and the screen reader would start
    // over at the top: the row that takes its place gets the focus, or the
    // one before when it was the last. While a dialog (a wait) has the focus,
    // that happens once the dialog has closed.
    const document = this.host.nativeElement.ownerDocument;
    effect(() => {
      this.items();
      untracked(() => {
        if (this.lastFocusedRowGone()) {
          this.afterRender(() => {
            if (document.activeElement === document.body) {
              this.focusInPlaceOfLastRow();
            }
          });
        }
      });
    });
    const onFocusLost = (event: Event) => {
      if (
        this.lastFocusedRowGone() &&
        this.scroller()?.clientHeight &&
        this.focusInPlaceOfLastRow()
      ) {
        event.preventDefault();
      }
    };
    document.addEventListener(FOCUS_LOST_EVENT, onFocusLost);
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() =>
      document.removeEventListener(FOCUS_LOST_EVENT, onFocusLost),
    );
    afterRenderEffect(() => {
      this.items();
      this.virtualizer.scrollRect();
      this.measureScrollMargin();
    });
  }

  /**
   * Called as the list comes to rest at `offset`: ends a touch whose end
   * cannot reach the list any more, and at the top any touch, so that the
   * first row lies at the top. A finger still resting on the list takes
   * the correction. Dragging on, it moves no row above the screen at the
   * top; elsewhere, its corrections would no longer wait for it.
   */
  private endLostTouch(offset: number): void {
    const start = this.touchStart;
    if (start instanceof Node && (!start.isConnected || offset <= 0)) {
      this.scroller()?.dispatchEvent(new Event('touchcancel'));
    }
  }

  private measureScrollMargin(): void {
    const scroller = this.scroller();
    if (!scroller || scroller.clientHeight === 0) {
      return;
    }
    const top = this.sizer().nativeElement.getBoundingClientRect().top;
    this.scrollMargin.set(
      Math.round(
        top - scroller.getBoundingClientRect().top + scroller.scrollTop,
      ),
    );
  }

  protected keepFocusedRow(event: FocusEvent): void {
    const index = Number(
      event.target instanceof Element
        ? event.target.closest('[data-index]')?.getAttribute('data-index')
        : undefined,
    );
    const item = this.items()[index];
    const row =
      item === undefined ? null : { key: this.itemKey()(item), index };
    this.focusedRow.set(row);
    this.lastFocusedRow = row;
  }

  private lastFocusedRowGone(): boolean {
    return (
      this.lastFocusedRow !== null && this.indexOfRow(this.lastFocusedRow) < 0
    );
  }

  /**
   * Focuses the row now at the place of the row that had the focus last;
   * false when nothing there takes it.
   */
  private focusInPlaceOfLastRow(): boolean {
    const document = this.host.nativeElement.ownerDocument;
    const index = Math.min(
      this.lastFocusedRow?.index ?? 0,
      this.items().length - 1,
    );
    const element = this.rowElements().find(
      ({ nativeElement }) =>
        nativeElement.getAttribute('data-index') === `${index}`,
    )?.nativeElement;
    for (const control of element?.querySelectorAll<HTMLElement>(FOCUSABLE) ??
      []) {
      // An Ionic button takes focus with the button in its shadow root.
      (
        control.shadowRoot?.querySelector<HTMLElement>(FOCUSABLE) ?? control
      ).focus();
      if (element?.contains(document.activeElement)) {
        return true;
      }
    }
    return false;
  }

  /** Called as a scroll starts, with the rows on the screen until then. */
  private keepRowsAtRest(
    range: { startIndex: number; endIndex: number } | null,
  ): void {
    const items = this.items();
    const keyOf = this.itemKey();
    const rows: KeptRow[] = [];
    if (range) {
      const last = Math.min(range.endIndex, items.length - 1);
      for (let index = range.startIndex; index <= last; index++) {
        rows.push({ key: keyOf(items[index]), index });
      }
    }
    this.restingRows.set(rows);
  }

  /** The place on the screen, to come back to with `restore`. */
  public anchor(): ListAnchor | null {
    const scroller = this.scroller();
    if (!scroller) {
      return null;
    }
    return anchorAt(this.virtualizer.getVirtualItems(), scroller.scrollTop);
  }

  /** Goes back to `anchor` once the list shows its current items. */
  public restore(anchor: ListAnchor | null): void {
    this.keyToReveal = null;
    this.afterRender(() => {
      const offset = this.offsetOf(anchor);
      if (offset !== null) {
        this.jumpTo(offset);
      }
    });
  }

  /**
   * Scrolls for the app (another segment, a search, a new order), not for the
   * screen reader: its focus is outside the rows. After a change of the items
   * the rows at the old position were never on the screen with them, so no
   * row is kept for the jump.
   */
  private jumpTo(offset: number): void {
    this.restingRows.set([]);
    const scroller = this.scroller();
    // Without a move there is no scroll event to end the jump.
    this.jump =
      scroller && Math.abs(scroller.scrollTop - offset) >= 1
        ? 'waiting'
        : 'none';
    this.virtualizer.scrollToOffset(offset);
  }

  /**
   * Brings the row with `key` on the screen once the list shows its current
   * items, clear of the add button; a row that is already there
   * stays where it is (see `reveal`). A hidden list (another tab) does so
   * when it is shown again.
   */
  public scrollToKey(key: RowKey): void {
    this.keyToReveal = key;
    this.afterRender(() => this.revealKey());
  }

  public scrollToTop(): void {
    this.keyToReveal = null;
    this.afterRender(() => this.jumpTo(0));
  }

  /**
   * Forgets the heights, for when all rows change theirs (cards collapsed):
   * the rows on the screen are measured again, the others count with the
   * estimate.
   */
  public measure(): void {
    this.afterRender(() => this.measureShown());
  }

  private measureShown(): void {
    this.virtualizer.measure();
    // Lays the rows out anew, with the estimate: a row as high as before
    // is only taken when compared with that.
    this.virtualizer.getVirtualItems();
    for (const { nativeElement } of this.rowElements()) {
      if (nativeElement.offsetParent !== null) {
        this.virtualizer.resizeItem(
          this.virtualizer.indexFromElement(nativeElement),
          nativeElement.getBoundingClientRect().height,
        );
      }
    }
  }

  /**
   * Called before the browser paints the new width: the rows on the screen
   * have their new height already, the others will have theirs once shown.
   */
  private measureAtNewWidth(): void {
    const anchor = this.anchor();
    // The content above the rows can wrap anew.
    this.measureScrollMargin();
    this.measureShown();
    const scroller = this.scroller();
    const offset = this.offsetOf(anchor);
    if (scroller && offset !== null) {
      // Not as a scroll command: rows measured before the browser reports
      // the new position would not move it then, and the anchor would slip.
      scroller.scrollTop = offset;
      this.virtualizer().scrollOffset = scroller.scrollTop;
    }
  }

  /** The scroll position that brings `anchor` back. */
  private offsetOf(anchor: ListAnchor | null): number | null {
    const scroller = this.scroller();
    if (!scroller) {
      return null;
    }
    // Lays the rows out with the heights measured last.
    this.virtualizer.getVirtualItems();
    const index = anchor ? this.indexOf(anchor.key) : -1;
    const start =
      index < 0
        ? undefined
        : this.virtualizer().measurementsCache[index]?.start;
    return anchorOffset(
      anchor,
      start,
      scroller.scrollHeight - scroller.clientHeight,
    );
  }

  private revealKey(): void {
    const scroller = this.scroller();
    if (this.keyToReveal === null || !scroller || scroller.clientHeight === 0) {
      return;
    }
    const index = this.indexOf(this.keyToReveal);
    this.keyToReveal = null;
    const row = this.virtualizer().measurementsCache[index];
    if (!row) {
      return;
    }
    const top = scroller.scrollTop;
    const addButtonRoom = parseFloat(
      getComputedStyle(this.host.nativeElement).paddingBottom,
    );
    const move = reveal(row, {
      start: top,
      end: top + scroller.clientHeight - addButtonRoom,
    });
    if (move === 'start') {
      this.virtualizer.scrollToIndex(index, { align: 'start' });
    } else if (move !== null) {
      this.virtualizer.scrollToOffset(top + move);
    }
  }

  private observeRows(): void {
    if (!this.observingRows) {
      this.observingRows = true;
      queueMicrotask(() => (this.observingRows = false));
    }
  }

  /** Where `row` is now; -1 once it is gone. */
  private indexOfRow({ key, index }: KeptRow): number {
    const item = this.items()[index];
    return item !== undefined && this.itemKey()(item) === key
      ? index
      : this.indexOf(key);
  }

  private indexOf(key: RowKey): number {
    const keyOf = this.itemKey();
    return this.items().findIndex((item) => keyOf(item) === key);
  }

  private afterRender(callback: () => void): void {
    afterNextRender(callback, { injector: this.injector });
  }
}
