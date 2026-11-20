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
  elementScroll,
  injectVirtualizer,
  measureElement,
  observeElementOffset,
  observeElementRect,
} from '@tanstack/angular-virtual';

import { UILog } from '../../services/uiLog';
import {
  anchorAt,
  anchorOffset,
  ListAnchor,
  reveal,
  RowKey,
} from './virtual-list-anchor';

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
 * Content marked `virtualListHead` (segments, search) stays at the top while
 * the rows scroll under it; other content is shown between it and the rows.
 */
@Component({
  selector: 'app-virtual-list',
  imports: [NgTemplateOutlet],
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
    .head {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--ion-background-color);
    }
    .sizer {
      position: relative;
      /* On iOS a correction waits while a finger or momentum moves the list,
         and the rows are drawn shifted by it meanwhile: at the top, the
         first rows lie above the list and would show over the head. */
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
  `,
  template: `
    <div #head class="head"><ng-content select="[virtualListHead]" /></div>
    <ng-content />
    <div #sizer class="sizer" [style.height.px]="totalSize()">
      <!-- Only some rows are rendered: each tells screen readers its place
           in the whole list. -->
      <div
        class="rows"
        role="list"
        [style.transform]="rowsOffset()"
        (focusin)="revealFocus($event)"
      >
        @for (row of rows(); track row.key) {
          <div
            #row
            class="row"
            role="listitem"
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
  private readonly head = viewChild.required<ElementRef<HTMLElement>>('head');
  private readonly sizer = viewChild.required<ElementRef<HTMLElement>>('sizer');

  private readonly scroller = signal<HTMLElement | undefined>(undefined);
  /** Where the rows start in the scroller, below the content above them. */
  private readonly scrollMargin = signal(0);
  /** The height of the head, which covers the top of the scroller. */
  private readonly headHeight = signal(0);
  /** The row `scrollToKey` brings on the screen once the list is shown. */
  private keyToReveal: RowKey | null = null;
  /** The width of the scroller the rows were measured at; 0 before. */
  private measuredWidth = 0;
  /** Set while the ResizeObserver of the rows tells their new heights. */
  private observingRows = false;

  private readonly virtualizer = injectVirtualizer<HTMLElement, HTMLElement>(
    () => {
      const items = this.items();
      const key = this.itemKey();
      const size = this.estimateSize();
      return {
        scrollElement: this.scroller(),
        count: items.length,
        getItemKey: (index) => key(items[index]),
        estimateSize: () => size,
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
              report(offset, isScrolling);
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
        scrollPaddingStart: this.headHeight(),
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

  protected readonly rows = computed(() => {
    const items = this.items();
    return this.virtualizer
      .getVirtualItems()
      .filter((row) => row.index < items.length)
      .map((row) => ({
        key: row.key,
        index: row.index,
        item: items[row.index],
      }));
  });
  /** The number of items while the last row is rendered, else 0. */
  private readonly endShown = computed(() => {
    const count = this.items().length;
    const last = this.virtualizer.getVirtualItems().at(-1);
    return last && last.index >= count - 1 ? count : 0;
  });
  protected readonly totalSize = computed(() =>
    this.virtualizer.getTotalSize(),
  );
  protected readonly rowsOffset = computed(() => {
    const first = this.virtualizer.getVirtualItems()[0];
    const offset = first ? first.start - this.scrollMargin() : 0;
    return `translateY(${offset}px)`;
  });

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

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const observer = new ResizeObserver(() => this.measureHead());
      observer.observe(this.head().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });

    afterRenderEffect(() => {
      this.items();
      this.headHeight();
      this.virtualizer.scrollRect();
      this.measureScrollMargin();
    });
  }

  private measureHead(): void {
    const height = this.head().nativeElement.offsetHeight;
    // A hidden page has no layout to measure.
    if (height > 0) {
      this.headHeight.set(height);
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

  /** Moves a focused element that the head covers below it. */
  protected revealFocus(event: FocusEvent): void {
    const scroller = this.scroller();
    if (!scroller || !(event.target instanceof Element)) {
      return;
    }
    const covered =
      this.head().nativeElement.getBoundingClientRect().bottom -
      event.target.getBoundingClientRect().top;
    if (covered > 0) {
      scroller.scrollTop -= covered;
    }
  }

  /** The place on the screen, to come back to with `restore`. */
  public anchor(): ListAnchor | null {
    const scroller = this.scroller();
    if (!scroller) {
      return null;
    }
    return anchorAt(
      this.virtualizer.getVirtualItems(),
      scroller.scrollTop + this.headHeight(),
    );
  }

  /** Goes back to `anchor` once the list shows its current items. */
  public restore(anchor: ListAnchor | null): void {
    this.keyToReveal = null;
    this.afterRender(() => {
      const offset = this.offsetOf(anchor);
      if (offset !== null) {
        this.virtualizer.scrollToOffset(offset);
      }
    });
  }

  /**
   * Brings the row with `key` on the screen once the list shows its current
   * items, clear of the head and the add button; a row that is already there
   * stays where it is (see `reveal`). A hidden list (another tab) does so
   * when it is shown again.
   */
  public scrollToKey(key: RowKey): void {
    this.keyToReveal = key;
    this.afterRender(() => this.revealKey());
  }

  public scrollToTop(): void {
    this.keyToReveal = null;
    this.afterRender(() => this.virtualizer.scrollToOffset(0));
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
    // The head and the content above the rows can wrap anew.
    this.measureHead();
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

  /** The scroll position that brings `anchor` back below the head. */
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
    const head = this.headHeight();
    return (
      anchorOffset(
        anchor,
        start,
        scroller.scrollHeight - scroller.clientHeight + head,
      ) - head
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
      start: top + this.headHeight(),
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

  private indexOf(key: RowKey): number {
    const keyOf = this.itemKey();
    return this.items().findIndex((item) => keyOf(item) === key);
  }

  private afterRender(callback: () => void): void {
    afterNextRender(callback, { injector: this.injector });
  }
}
