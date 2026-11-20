import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
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
 * heights are kept per key while the items are rebuilt. On a page with a
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
        // Only the ResizeObserver measures, a frame after a row appeared:
        // when it is rendered, its Ionic elements are not drawn yet and
        // the row is far too low, so many more rows would be rendered. A
        // hidden page reports its rows without height; they keep theirs.
        measureElement: (element, entry, instance) => {
          const measured = entry ? measureElement(element, entry, instance) : 0;
          return measured > 0
            ? measured
            : (instance.itemSizeCache.get(
                instance.options.getItemKey(instance.indexFromElement(element)),
              ) ?? size);
        },
        useAnimationFrameWithResizeObserver: true,
        // A hidden page (another tab) has no height and reads as scrolled to
        // the top. The list keeps its rows and position meanwhile, so that
        // they need not be built and measured again when it is shown.
        observeElementRect: (instance, report) =>
          observeElementRect(instance, (rect) => {
            if (rect.height > 0) {
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
        scrollMargin: this.scrollMargin(),
        scrollPaddingStart: this.headHeight(),
        // The rows are signals; Angular renders them when they change.
        useApplicationRefTick: false,
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
      for (const row of this.rowElements()) {
        this.virtualizer.measureElement(row.nativeElement);
      }
    });

    effect(() => {
      if (this.endShown() > 0) {
        untracked(() => this.endReached.emit());
      }
    });

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const observer = new ResizeObserver(() => {
        const height = this.head().nativeElement.offsetHeight;
        // A hidden page has no layout to measure.
        if (height > 0) {
          this.headHeight.set(height);
        }
      });
      observer.observe(this.head().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });

    afterRenderEffect(() => {
      this.items();
      this.headHeight();
      this.virtualizer.scrollRect();
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
    });
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
      const scroller = this.scroller();
      if (!scroller) {
        return;
      }
      const index = anchor ? this.indexOf(anchor.key) : -1;
      const start =
        index < 0
          ? undefined
          : this.virtualizer().measurementsCache[index]?.start;
      const head = this.headHeight();
      this.virtualizer.scrollToOffset(
        anchorOffset(
          anchor,
          start,
          scroller.scrollHeight - scroller.clientHeight + head,
        ) - head,
      );
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
    this.afterRender(() => {
      this.virtualizer.measure();
      for (const { nativeElement } of this.rowElements()) {
        if (nativeElement.offsetParent !== null) {
          this.virtualizer.resizeItem(
            this.virtualizer.indexFromElement(nativeElement),
            nativeElement.offsetHeight,
          );
        }
      }
    });
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

  private indexOf(key: RowKey): number {
    const keyOf = this.itemKey();
    return this.items().findIndex((item) => keyOf(item) === key);
  }

  private afterRender(callback: () => void): void {
    afterNextRender(callback, { injector: this.injector });
  }
}
