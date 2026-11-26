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

import { FOCUS_LOST_EVENT } from '../../../services/a11y/page-focus.service';
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

/** The content above the rows, where a page shows it. */
const ABOVE = 50;
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
        @if (contentAbove()) {
          <p class="above" style="height: ${ABOVE}px; margin: 0">Above</p>
        }
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
  public readonly contentAbove = signal(false);
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
    <ion-segment value="open">
      <ion-segment-button value="open">Open</ion-segment-button>
      <ion-segment-button value="archive">Archive</ion-segment-button>
    </ion-segment>
    <div
      id="scroller"
      style="height: ${SCREEN}px; width: ${WIDTH}px; overflow: auto"
    >
      <app-virtual-list [items]="items" [itemKey]="key" [estimateSize]="100">
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

  /** Scrolls once the list has stood still, as a new scroll. */
  async function scrollAgainTo(offset: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await scrollTo(offset);
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

  it('renders only the rows near the screen', async () => {
    expect(shown().length).toBeGreaterThan(0);
    expect(shown().length).toBeLessThan(10);
    expect(shown()[0]).toBe('item-0');
    expect(top('item-0')).toBe(0);
    // The list ends with room for the add button.
    expect(scroller().scrollHeight).toBe(100 * 100 + 56 + 2 * 16);
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

    expect(scroller().scrollHeight).toBe(100 * 100);
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

  it('is no tab panel without a segment before it', () => {
    expect(fixture.nativeElement.querySelector('[role="tabpanel"]')).toBeNull();
  });

  it('measures the rows and moves the next ones', async () => {
    host.items.set([{ id: 'item-0', height: 250 }, ...items(100).slice(1)]);
    await settle();

    expect(top('item-1')).toBe(250);
  });

  it('lays out the rows after the screen once when it jumps to rows not measured yet', async () => {
    const count = 2000;
    host.items.set(items(count, 130));
    await settle();
    host.keysRead = 0;

    // Into the middle of a row, not at its edge.
    await scrollTo(100_050);

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
    expect(top('item-0')).toBe(0);
  });

  it('brings a row on the screen by its key and leaves a shown one', async () => {
    host.list().scrollToKey('item-50');
    await settle();

    expect(shown()).toContain('item-50');
    const offset = scroller().scrollTop;
    expect(top('item-50')).toBeGreaterThanOrEqual(0);
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
    expect(top('item-50')).toBeGreaterThanOrEqual(0);
    expect(top('item-50')).toBeLessThan(SCREEN);
  });

  it('brings a row cut off by the add button above it', async () => {
    // The add button and its margins cover the bottom of the screen.
    const clear = SCREEN - (56 + 2 * 16);
    host.list().scrollToKey('item-3');
    await settle();
    expect(top('item-3') + 100).toBe(clear);

    // Wholly under the button: shown from its start.
    host.list().scrollToKey('item-4');
    await settle();
    expect(top('item-4')).toBe(0);
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

    expect(top('item-30')).toBe(-20);
  });

  it('measures the rows again when asked to', async () => {
    host.items.set(items(100, 40));
    host.estimate.set(40);
    host.list().measure();
    await settle();

    expect(top('item-1')).toBe(40);
    expect(scroller().scrollHeight).toBeLessThan(100 * 100);
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

  describe('when the row with the focus is deleted', () => {
    const without = (id: string) =>
      host.items.set(host.items().filter((item) => item.id !== id));

    it('puts focus on the row that takes its place', async () => {
      document.getElementById('item-2').focus();

      without('item-2');
      await settle();

      expect(document.activeElement?.id).toBe('item-3');
    });

    it('puts focus on the row before when it was the last', async () => {
      host.items.set(items(3));
      await settle();
      document.getElementById('item-2').focus();

      without('item-2');
      await settle();

      expect(document.activeElement?.id).toBe('item-1');
    });

    it('leaves focus where it went in the meantime', async () => {
      const outside = document.createElement('button');
      document.body.append(outside);
      document.getElementById('item-2').focus();

      without('item-2');
      outside.focus();
      await settle();

      expect(document.activeElement).toBe(outside);
      outside.remove();
    });

    it('puts focus on the row at its place once a dialog that had it is gone', async () => {
      const wait = document.createElement('button');
      document.body.append(wait);
      document.getElementById('item-2').focus();
      wait.focus();
      without('item-2');
      await settle();
      expect(document.activeElement).toBe(wait);

      wait.remove();
      const lost = new Event(FOCUS_LOST_EVENT, { cancelable: true });
      document.dispatchEvent(lost);

      expect(lost.defaultPrevented).toBeTrue();
      expect(document.activeElement?.id).toBe('item-3');
    });

    it('leaves the focus to others when no row was deleted', () => {
      document.getElementById('item-2').focus();
      const lost = new Event(FOCUS_LOST_EVENT, { cancelable: true });
      document.dispatchEvent(lost);

      expect(lost.defaultPrevented).toBeFalse();
    });
  });

  it('keeps the rows on the screen in their place until the next scroll', async () => {
    const before = shown();
    expect(before).toEqual(['item-0', 'item-1', 'item-2', 'item-3', 'item-4']);

    await scrollTo(5000);
    expect(shown()).toEqual(jasmine.arrayContaining(['item-0', 'item-3']));
    expect(top('item-1')).toBe(100 - 5000);
    expect(top('item-50')).toBe(0);

    await scrollTo(0);
    expect(top('item-1')).toBe(100);
    expect(top('item-2')).toBe(200);

    await scrollAgainTo(5000);
    await scrollAgainTo(7000);
    expect(shown()).not.toContain('item-1');
    expect(shown()).toEqual(jasmine.arrayContaining(['item-50', 'item-70']));
    expect(top('item-50')).toBe(5000 - 7000);
  });

  it('keeps no rows that were never on the screen when it comes back to an anchor', async () => {
    // At rest away from the top, so that no row at the top was on the screen.
    await scrollAgainTo(4800);
    await scrollAgainTo(5000);
    const anchor = host.list().anchor();

    // Another segment at its top, and back once it stands still.
    host.items.set(items(100).map((i) => ({ ...i, id: `other-${i.id}` })));
    host.list().restore(null);
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 200));
    host.items.set(items(100));
    host.list().restore(anchor);
    await settle();

    expect(top('item-50')).toBe(0);
    expect(shown()).not.toContain('item-0');
  });

  it('keeps the rows on the screen again at the next scroll after a jump of the app', async () => {
    await scrollAgainTo(3000);
    host.list().scrollToTop();
    await settle();
    await scrollAgainTo(5000);
    await scrollAgainTo(7000);

    expect(shown()).toEqual(jasmine.arrayContaining(['item-50', 'item-70']));
  });

  it('keeps the rows on the screen by their key when items are added', async () => {
    await scrollTo(5000);
    host.items.set([{ id: 'new', height: 100 }, ...items(100)]);
    await settle();

    expect(shown()).toContain('item-1');
    expect(top('item-1')).toBe(200 - scroller().scrollTop);
  });

  it('keeps the row with the focus in its place while the list scrolls away', async () => {
    document.getElementById('item-1').focus();
    await settle();

    await scrollTo(5000);
    await scrollAgainTo(7000);
    expect(document.activeElement?.id).toBe('item-1');
    expect(top('item-1')).toBe(100 - 7000);
    expect(top('item-70')).toBe(0);
    expect(shown()).not.toContain('item-2');

    await scrollAgainTo(0);
    expect(top('item-1')).toBe(100);
    expect(top('item-2')).toBe(200);
  });

  it('lets the row go once the focus has moved on', async () => {
    document.getElementById('item-1').focus();
    await settle();
    document.getElementById('item-2').focus();
    await settle();
    await scrollTo(5000);
    await scrollAgainTo(7000);
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
    expect(top('item-30')).toBe(0);

    await frame();
    document.getElementById('item-29').style.height = '200px';

    expect(await paintedTops('item-30', 3)).toEqual([0, 0, 0]);
    expect(scroller().scrollTop).toBe(3100);
  });

  it('keeps a position written in the frame a row above grows', async () => {
    await scrollTo(3000);

    // Written before the browser reports it: the correction adds to it.
    await frame();
    document.getElementById('item-29').style.height = '200px';
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
        (scroller().scrollHeight - roomForAddButton - 100 * estimate) /
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
        (scroller().scrollHeight - roomForAddButton - 100 * estimate) /
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
      document.getElementById('item-29').style.height = '200px';
      const held = await paintedTops('item-30', 3);
      touch('touchend');
      // The correction is written once the touch has ended (150ms).
      const released = await paintedTops('item-30', 30);

      expect(held).toEqual([0, 0, 0]);
      expect(released).toEqual(released.map(() => 0));
      expect(scroller().scrollTop).toBe(3100);
    });

    it('holds a correction while a finger rests on the list, away from the top', async () => {
      await scrollTo(2900);
      touch('touchstart');
      await scrollAgainTo(3000);
      document.getElementById('item-29').style.height = '200px';
      const held = await paintedTops('item-30', 30);

      expect(held).toEqual(held.map(() => 0));
      expect(scroller().scrollTop).toBe(3000);
    });

    it('lets go of a touch whose end never reached the list once it rests at the top', async () => {
      host.items.set(items(100, 150));
      host.estimate.set(280);
      await settle();
      await scrollTo(3000);
      touch('touchstart');
      for (let offset = 2700; offset >= 0; offset -= 300) {
        await scrollTo(offset);
      }
      const held = top('item-0');
      await paintedTops('item-1', 30);

      expect(held).not.toBe(0);
      expect(scroller().scrollTop).toBe(0);
      expect(top('item-0')).toBe(0);
      expect(top('item-1')).toBe(150);
    });

    it('draws no row above the list while a correction waits at the top', async () => {
      host.contentAbove.set(true);
      await settle();
      await scrollTo(ABOVE + 150);
      touch('touchstart');
      await frame();
      // The first row, above the screen, turns out higher than measured;
      // then the finger reaches the top before the touch ends.
      host.items.set([{ id: 'item-0', height: 300 }, ...items(100).slice(1)]);
      await settle();
      await scrollTo(0);

      // Nothing but the content above lies at the top of the list.
      const above = fixture.nativeElement.querySelector('.above');
      above.style.visibility = 'hidden';
      const { left, right } = scroller().getBoundingClientRect();
      const hit = document.elementFromPoint(
        (left + right) / 2,
        scroller().getBoundingClientRect().top + ABOVE / 2,
      );
      above.style.visibility = '';
      expect(hit?.closest('.item')).toBeNull();

      touch('touchend');
      await paintedTops('item-1', 30);
      await scrollTo(0);
      expect(top('item-0')).toBe(ABOVE);
      expect(top('item-1')).toBe(ABOVE + 300);
    });

    it('lets go of a touch on a row taken off once the list rests, and goes back to the top', async () => {
      // Turned sideways: the cards are lower than estimated, and those above
      // the screen make the list shorter as they are measured.
      scroller().style.width = `${2 * WIDTH}px`;
      host.items.set(items(100, 150));
      host.estimate.set(280);
      host.list().measure();
      await settle();
      await scrollTo(5000);

      // The finger is on a row that is taken off (deleted); the end of its
      // touch goes to the row, off the list.
      const touched = shown().find((id) => top(id) >= 0);
      const row = document.getElementById(touched);
      row.dispatchEvent(new Event('touchstart', { bubbles: true }));
      host.items.set(host.items().filter((item) => item.id !== touched));
      await settle();
      row.dispatchEvent(new Event('touchend', { bubbles: true }));

      for (let offset = 4700; offset >= 2000; offset -= 300) {
        await scrollTo(offset);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      host.list().scrollToTop();
      await paintedTops('item-1', 30);

      expect(scroller().scrollTop).toBe(0);
      expect(top('item-0')).toBe(0);
      expect(top('item-1')).toBe(150);
    });

    it('writes the corrections of a fling into the bounce at the top once it rests, after the device was turned', async () => {
      host.items.set(items(100, 150));
      host.estimate.set(280);
      await settle();
      await scrollTo(5000);
      // Turned: the rows above the screen count with the estimate again.
      scroller().style.width = `${2 * WIDTH}px`;
      await settle();

      // The scroller reports what iOS reports while it bounces.
      let bounce: number | null = null;
      const native = Object.getOwnPropertyDescriptor(
        Element.prototype,
        'scrollTop',
      );
      Object.defineProperty(scroller(), 'scrollTop', {
        configurable: true,
        get(this: Element) {
          return bounce ?? (native.get.call(this) as number);
        },
        set(this: Element, value: number) {
          native.set.call(this, value);
        },
      });

      // The fling ends 150ms after its last scroll event. A slow runner
      // can take that long between two of them, so the time stands still
      // until the list rests. The end of the scroll before is waited for
      // first: the held clock cannot cancel a timer started before it.
      await new Promise((resolve) => setTimeout(resolve, 200));
      jasmine.clock().install();
      let held: number;
      try {
        touch('touchstart');
        for (let offset = 4700; offset >= 3500; offset -= 300) {
          await scrollTo(offset);
        }
        touch('touchend');
        for (let offset = 3200; offset >= 0; offset -= 400) {
          await scrollTo(offset);
        }
        await scrollTo(0);
        for (const offset of [-40, -15]) {
          bounce = offset;
          scroller().dispatchEvent(new Event('scroll'));
          await frame();
        }
        // Held while it bounces: the rows measured lower above the screen.
        held = top('item-0');
        // Back at 0 with no further scroll event.
        bounce = null;
        jasmine.clock().tick(300);
      } finally {
        jasmine.clock().uninstall();
      }
      await paintedTops('item-1', 30);

      expect(held).toBeGreaterThan(1000);
      expect(scroller().scrollTop).toBe(0);
      expect(top('item-0')).toBe(0);
      expect(top('item-1')).toBe(150);
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
