import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IonContent } from '@ionic/angular';

import { UILog } from '../../../services/uiLog';
import {
  VirtualListComponent,
  VirtualRowDirective,
} from '../virtual-list.component';

interface Item {
  id: string;
  height: number;
}

const HEAD = 50;
const SCREEN = 400;

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
      style="height: ${SCREEN}px; overflow: auto; --bq-space-4: 16px"
    >
      <app-virtual-list
        [items]="items()"
        [itemKey]="key"
        [estimateSize]="estimate()"
        [clearOfAddButton]="clearOfAddButton()"
      >
        <div virtualListHead style="height: ${HEAD}px">Head</div>
        <ng-template [appVirtualRow]="items()" let-item>
          <button class="item" [id]="item.id" [style.height.px]="item.height">
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
  public readonly key = (item: Item) => item.id;
  public readonly list =
    viewChild.required<VirtualListComponent<Item>>(VirtualListComponent);
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

  it('measures the rows and moves the next ones', async () => {
    host.items.set([{ id: 'item-0', height: 250 }, ...items(100).slice(1)]);
    await settle();

    expect(top('item-1')).toBe(HEAD + 250);
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
});
