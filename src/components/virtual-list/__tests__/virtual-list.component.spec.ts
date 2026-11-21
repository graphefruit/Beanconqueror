import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  signal,
  viewChild,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IonContent } from '@ionic/angular';
import { defineCustomElement as defineSegmentButton } from '@ionic/core/components/ion-segment-button.js';
import { defineCustomElement as defineSegment } from '@ionic/core/components/ion-segment.js';

import { _resetIOSDetectionForTests } from '@tanstack/angular-virtual';

import { UILog } from '../../../services/uiLog';
import {
  VirtualListComponent,
  VirtualRowDirective,
} from '../virtual-list.component';

interface Item {
  id: string;
  height: number;
  /** Width to height: the row is as high as its width allows. */
  ratio?: number;
}

const HEAD = 50;
const SCREEN = 400;
const WIDTH = 400;

function items(count: number, height = 100): Item[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    height,
  }));
}

@Component({
  imports: [VirtualListComponent, VirtualRowDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      id="scroller"
      style="height: ${SCREEN}px; width: ${WIDTH}px; overflow: auto; --bq-space-4: 16px"
    >
      <app-virtual-list
        [items]="items()"
        [itemKey]="key"
        [estimateSize]="estimate()"
        [clearOfAddButton]="clearOfAddButton()"
        (endReached)="ends = ends + 1"
      >
        <div virtualListHead style="height: ${HEAD}px">Head</div>
        <ng-template [appVirtualRow]="items()" let-item>
          <button
            class="item"
            style="display: block; width: 100%"
            [id]="item.id"
            [style.height.px]="item.ratio ? null : item.height"
            [style.aspect-ratio]="item.ratio ?? null"
          >
            {{ item.id }}
          </button>
        </ng-template>
      </app-virtual-list>
    </div>
  `,
  providers: [
    {
      provide: IonContent,
      useValue: {
        getScrollElement: () =>
          Promise.resolve(document.getElementById('scroller')),
      },
    },
  ],
})
class HostComponent {
  public readonly items = signal(items(100));
  public readonly estimate = signal(100);
  public readonly clearOfAddButton = signal(true);
  public ends = 0;
  public keysRead = 0;
  public readonly key = (item: Item) => {
    this.keysRead++;
    return item.id;
  };
  public readonly list =
    viewChild.required<VirtualListComponent<Item>>(VirtualListComponent);
}

@Component({
  imports: [VirtualListComponent, VirtualRowDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div
      id="scroller"
      style="height: ${SCREEN}px; width: ${WIDTH}px; overflow: auto"
    >
      <app-virtual-list [items]="items" [itemKey]="key" [estimateSize]="100">
        <ion-segment virtualListHead value="open">
          <ion-segment-button value="open">Open</ion-segment-button>
          <ion-segment-button value="archive">Archive</ion-segment-button>
        </ion-segment>
        <p>Nothing found</p>
        <ng-template [appVirtualRow]="items" let-item>
          <div class="item" style="height: 100px">{{ item.id }}</div>
        </ng-template>
      </app-virtual-list>
    </div>
  `,
  providers: [
    {
      provide: IonContent,
      useValue: {
        getScrollElement: () =>
          Promise.resolve(document.getElementById('scroller')),
      },
    },
  ],
})
class SegmentHostComponent {
  public readonly items = items(10);
  public readonly key = (item: Item) => item.id;
}

describe('VirtualListComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const scroller = () => document.getElementById('scroller');
  const shown = () =>
    [...fixture.nativeElement.querySelectorAll('.item')].map(
      (element: Element) => element.id,
    );
  const top = (id: string) =>
    document.getElementById(id).getBoundingClientRect().top -
    scroller().getBoundingClientRect().top;

  /** Lets the list render, measure and render again. */
  async function settle(): Promise<void> {
    for (let i = 0; i < 4; i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await fixture.whenStable();
    }
  }

  const frame = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  /**
   * The top of `id` in each of the next `count` frames, read at their start:
   * what the frame before was painted with.
   */
  async function paintedTops(id: string, count: number): Promise<number[]> {
    const tops: number[] = [];
    for (let i = 0; i < count; i++) {
      await frame();
      tops.push(top(id));
    }
    return tops;
  }

  async function scrollTo(offset: number): Promise<void> {
    scroller().scrollTop = offset;
    scroller().dispatchEvent(new Event('scroll'));
    await settle();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: UILog, useValue: { error: () => undefined } }],
    });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.autoDetectChanges();
    await settle();
  });

  afterEach(() => fixture.destroy());

  it('renders only the rows near the screen, below the head', async () => {
    expect(shown().length).toBeGreaterThan(0);
    expect(shown().length).toBeLessThan(10);
    expect(shown()[0]).toBe('item-0');
    expect(top('item-0')).toBe(HEAD);
    // The list ends with room for the add button.
    expect(scroller().scrollHeight).toBe(HEAD + 100 * 100 + 56 + 2 * 16);
  });

  it('tells when the last row is rendered, to load more', async () => {
    expect(host.ends).toBe(0);

    await scrollTo(100 * 100);
    expect(host.ends).toBe(1);
    // Scrolling at the end does not ask again.
    await scrollTo(100 * 100 - 50);
    expect(host.ends).toBe(1);

    // More items, still shown to their end.
    host.items.set(items(101));
    await scrollTo(101 * 100);
    expect(host.ends).toBe(2);

    // Away from the end and back.
    await scrollTo(0);
    await scrollTo(101 * 100);
    expect(host.ends).toBe(3);
  });

  it('ends with the last row on a page without add button', async () => {
    host.clearOfAddButton.set(false);
    await settle();

    expect(scroller().scrollHeight).toBe(HEAD + 100 * 100);
  });

  it('tells screen readers the size of the whole list', async () => {
    await scrollTo(3000);

    const list = fixture.nativeElement.querySelector('[role="list"]');
    const rows = [...list.children].filter(
      (element: Element) => element.getAttribute('role') === 'listitem',
    );
    expect(rows.length).toBe(shown().length);
    const first = rows[0] as Element;
    expect(first.getAttribute('aria-setsize')).toBe('100');
    expect(first.getAttribute('aria-posinset')).toBe(
      String(Number(first.querySelector('.item').id.slice(5)) + 1),
    );
  });

  it('is no tab panel without a segment in its head', () => {
    expect(fixture.nativeElement.querySelector('[role="tabpanel"]')).toBeNull();
  });

  it('measures the rows and moves the next ones', async () => {
    host.items.set([{ id: 'item-0', height: 250 }, ...items(100).slice(1)]);
    await settle();

    expect(top('item-1')).toBe(HEAD + 250);
  });

  it('lays out the rows after the screen once when it jumps to rows not measured yet', async () => {
    const count = 2000;
    host.items.set(items(count, 130));
    await settle();
    host.keysRead = 0;

    await scrollTo(100_000);

    const after = count - Number(shown()[0].slice(5));
    // Rows above the screen are among them, which move the content.
    expect(shown().length).toBeGreaterThan(4);
    expect(host.keysRead).toBeLessThan(2 * after);
  });

  it('keeps a hidden row at its height', async () => {
    const before = scroller().scrollHeight;
    scroller().style.display = 'none';
    await settle();
    scroller().style.display = '';
    await settle();

    expect(scroller().scrollHeight).toBe(before);
    expect(top('item-0')).toBe(HEAD);
  });

  it('brings a row on the screen by its key and leaves a shown one', async () => {
    host.list().scrollToKey('item-50');
    await settle();

    expect(shown()).toContain('item-50');
    const offset = scroller().scrollTop;
    expect(top('item-50')).toBeGreaterThanOrEqual(HEAD);
    expect(top('item-50')).toBeLessThan(SCREEN);

    host.list().scrollToKey('item-51');
    host.list().scrollToKey('unknown');
    await settle();

    expect(scroller().scrollTop).toBe(offset);
  });

  it('brings a row on the screen that was asked for while hidden', async () => {
    scroller().style.display = 'none';
    await settle();
    host.list().scrollToKey('item-50');
    await settle();
    scroller().style.display = '';
    await settle();

    expect(shown()).toContain('item-50');
    expect(top('item-50')).toBeGreaterThanOrEqual(HEAD);
    expect(top('item-50')).toBeLessThan(SCREEN);
  });

  it('brings a row cut off by the add button above it', async () => {
    // The add button and its margins cover the bottom of the screen.
    const clear = SCREEN - (56 + 2 * 16);
    host.list().scrollToKey('item-2');
    await settle();
    expect(top('item-2') + 100).toBe(clear);

    // Wholly under the button: shown from its start.
    host.list().scrollToKey('item-3');
    await settle();
    expect(top('item-3')).toBe(HEAD);
  });

  it('leaves a row higher than the screen that is shown', async () => {
    const tall = items(100);
    tall[1] = { id: 'item-1', height: 1000 };
    host.items.set(tall);
    await settle();
    await scrollTo(300);

    host.list().scrollToKey('item-1');
    await settle();

    expect(scroller().scrollTop).toBe(300);
  });

  it('goes back to the top', async () => {
    await scrollTo(3000);
    host.list().scrollToTop();
    await settle();

    expect(scroller().scrollTop).toBe(0);
  });

  it('comes back to an anchor after the items changed', async () => {
    await scrollTo(3020);
    const anchor = host.list().anchor();
    expect(anchor?.key).toBe('item-30');

    host.items.set(items(3));
    host.list().restore(null);
    await settle();
    expect(scroller().scrollTop).toBe(0);

    // Two new items above move the row down.
    host.items.set([
      ...items(2, 100).map((i) => ({ ...i, id: `new-${i.id}` })),
      ...items(100),
    ]);
    host.list().restore(anchor);
    await settle();

    expect(top('item-30')).toBe(-20 + HEAD);
  });

  it('measures the rows again when asked to', async () => {
    host.items.set(items(100, 40));
    host.estimate.set(40);
    host.list().measure();
    await settle();

    expect(top('item-1')).toBe(HEAD + 40);
    expect(scroller().scrollHeight).toBeLessThan(HEAD + 100 * 100);
  });

  it('keeps the heights of other items when the estimate changes', async () => {
    host.items.set(items(100, 150));
    await settle();
    await scrollTo(3000);
    const anchor = host.list().anchor();
    const before = top(String(anchor?.key));

    // Another segment, collapsed, and back.
    host.items.set(items(100, 40).map((i) => ({ ...i, id: `other-${i.id}` })));
    host.estimate.set(40);
    host.list().restore(null);
    await settle();
    host.items.set(items(100, 150));
    host.estimate.set(100);
    host.list().restore(anchor);
    await settle();

    expect(top(String(anchor?.key))).toBe(before);
  });

  it('moves a focused row from under the head', async () => {
    await scrollTo(1000);
    const covered = shown().find((id) => top(id) < HEAD && top(id) > -100);
    expect(covered).toBeDefined();

    document.getElementById(covered).focus();
    await settle();

    expect(top(covered)).toBe(HEAD);
  });
  it('keeps the row with the focus in its place while the list scrolls away', async () => {
    document.getElementById('item-1').focus();
    await settle();

    await scrollTo(5000);
    expect(document.activeElement?.id).toBe('item-1');
    expect(top('item-1')).toBe(HEAD + 100 - 5000);
    expect(top('item-50')).toBe(HEAD);
    expect(shown()).not.toContain('item-2');

    await scrollTo(0);
    expect(top('item-1')).toBe(HEAD + 100);
    expect(top('item-2')).toBe(HEAD + 200);
  });

  it('lets the row go once the focus has moved on', async () => {
    document.getElementById('item-1').focus();
    await settle();
    document.getElementById('item-2').focus();
    await settle();
    await scrollTo(5000);
    expect(shown()).not.toContain('item-1');
    expect(shown()).toContain('item-2');

    document.getElementById('item-2').blur();
    await settle();
    expect(shown()).not.toContain('item-2');
  });

  it('asks for more items only near the end, not for a last row with the focus', async () => {
    await scrollTo(100 * 100);
    expect(host.ends).toBe(1);
    document.getElementById('item-99').focus();
    await settle();

    await scrollTo(0);
    await scrollTo(100 * 100);
    expect(host.ends).toBe(2);
  });

  it('keeps the rows on the screen in place in the frame a row above grows', async () => {
    await scrollTo(3000);
    expect(top('item-30')).toBe(HEAD);

    await frame();
    document.getElementById('item-28').style.height = '200px';

    expect(await paintedTops('item-30', 3)).toEqual([HEAD, HEAD, HEAD]);
    expect(scroller().scrollTop).toBe(3100);
  });

  it('keeps a position written in the frame a row above grows', async () => {
    await scrollTo(3000);

    // Written before the browser reports it: the correction adds to it.
    await frame();
    document.getElementById('item-28').style.height = '200px';
    scroller().scrollTop = 3500;
    await settle();

    expect(scroller().scrollTop).toBe(3600);
  });

  describe('turned or resized', () => {
    // Rows a quarter as high as they are wide: 100px on the 400px screen.
    const estimate = 130;
    const roomForAddButton = 56 + 2 * 16;

    beforeEach(async () => {
      host.items.set(items(100).map((item) => ({ ...item, ratio: 4 })));
      host.estimate.set(estimate);
      await settle();
      await scrollTo(3000);
      await settle();
    });

    /**
     * Rows measured before the width changed count with the estimate again:
     * the list is as long as if each row were the estimate or, measured
     * since, 200px.
     */
    function expectOnlyNewHeights(): void {
      const measured =
        (scroller().scrollHeight - HEAD - roomForAddButton - 100 * estimate) /
        (200 - estimate);
      expect(Number.isInteger(measured)).toBe(true);
      expect(measured).toBeGreaterThanOrEqual(shown().length);
    }

    it('keeps the top row in place and measures the rows again', async () => {
      const anchor = host.list().anchor();
      const before = top(String(anchor?.key));

      scroller().style.width = `${2 * WIDTH}px`;
      await settle();

      expect(top(String(anchor?.key))).toBe(before);
      expectOnlyNewHeights();
    });

    it('does so when a hidden list is shown at another width', async () => {
      const anchor = host.list().anchor();
      const before = top(String(anchor?.key));

      scroller().style.display = 'none';
      await settle();
      scroller().style.width = `${2 * WIDTH}px`;
      await settle();
      scroller().style.display = '';
      await settle();

      expect(top(String(anchor?.key))).toBe(before);
      expectOnlyNewHeights();
    });

    it('keeps the height of a row that is as high at the new width', async () => {
      host.items.set(items(100));
      await settle();
      const anchor = host.list().anchor();
      const before = top(String(anchor?.key));

      scroller().style.width = `${2 * WIDTH}px`;
      await settle();

      expect(top(String(anchor?.key))).toBe(before);
      // Each row counts with the estimate, or 100 when measured.
      const measured =
        (scroller().scrollHeight - HEAD - roomForAddButton - 100 * estimate) /
        (100 - estimate);
      expect(measured).toBeGreaterThanOrEqual(shown().length);
    });

    it('keeps the heights when only the height changes (keyboard)', async () => {
      const height = scroller().scrollHeight;
      const anchor = host.list().anchor();
      const before = top(String(anchor?.key));

      scroller().style.height = `${SCREEN - 150}px`;
      await settle();

      expect(scroller().scrollHeight).toBe(height);
      expect(top(String(anchor?.key))).toBe(before);
    });
  });

  describe('on iOS', () => {
    // iPadOS reports a Mac with touch.
    beforeEach(() => {
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 5,
        configurable: true,
      });
      _resetIOSDetectionForTests();
    });

    afterEach(() => {
      delete (navigator as { platform?: string }).platform;
      delete (navigator as { maxTouchPoints?: number }).maxTouchPoints;
      _resetIOSDetectionForTests();
    });

    const touch = (type: 'touchstart' | 'touchend') =>
      scroller().dispatchEvent(new Event(type));

    it('keeps the rows on the screen in place while a correction waits for the touch', async () => {
      await scrollTo(3000);
      touch('touchstart');
      await frame();
      document.getElementById('item-28').style.height = '200px';
      const held = await paintedTops('item-30', 3);
      touch('touchend');
      // The correction is written once the touch has ended (150ms).
      const released = await paintedTops('item-30', 30);

      expect(held).toEqual([HEAD, HEAD, HEAD]);
      expect(released).toEqual(released.map(() => HEAD));
      expect(scroller().scrollTop).toBe(3100);
    });

    it('draws no row above the list while a correction waits at the top', async () => {
      await scrollTo(150);
      touch('touchstart');
      await frame();
      // The first row, above the screen, turns out higher than measured;
      // then the finger reaches the top before the touch ends.
      host.items.set([{ id: 'item-0', height: 300 }, ...items(100).slice(1)]);
      await settle();
      await scrollTo(0);

      // Nothing but the head lies at the top of the list.
      const head = fixture.nativeElement.querySelector('.head');
      head.style.visibility = 'hidden';
      const { left, right } = scroller().getBoundingClientRect();
      const hit = document.elementFromPoint(
        (left + right) / 2,
        scroller().getBoundingClientRect().top + HEAD / 2,
      );
      head.style.visibility = '';
      expect(hit?.closest('.item')).toBeNull();

      touch('touchend');
      await paintedTops('item-1', 30);
      await scrollTo(0);
      expect(top('item-0')).toBe(HEAD);
      expect(top('item-1')).toBe(HEAD + 300);
    });
  });
});

describe('VirtualListComponent below a segment', () => {
  let fixture: ComponentFixture<SegmentHostComponent>;

  beforeAll(() => {
    defineSegment();
    defineSegmentButton();
  });

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: UILog, useValue: { error: () => undefined } }],
    });
    fixture = TestBed.createComponent(SegmentHostComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('makes the content and the rows the panel of the selected tab', async () => {
    const element = fixture.nativeElement as HTMLElement;
    const open = element.querySelector('ion-segment-button');
    for (
      let i = 0;
      i < 120 &&
      !element.querySelector('[role="tabpanel"][aria-labelledby] .item');
      i++
    ) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await fixture.whenStable();
    }

    const panel = element.querySelector('[role="tabpanel"]');
    expect(panel.getAttribute('aria-labelledby')).toBe(open.id);
    expect(panel.querySelector('p').textContent).toBe('Nothing found');
    expect(panel.querySelector('[role="list"] .item')).not.toBeNull();
    expect(panel.querySelector('ion-segment')).toBeNull();
  });
});
