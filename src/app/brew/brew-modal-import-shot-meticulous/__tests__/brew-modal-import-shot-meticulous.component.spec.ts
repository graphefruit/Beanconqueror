import { Component, input, provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalController, provideIonicAngular } from '@ionic/angular';

import { provideTranslateService } from '@ngx-translate/core';

import { MeticulousDevice } from '../../../../classes/preparationDevice/meticulous/meticulousDevice';
import { GraphDisplayCardComponent } from '../../../../components/graph-display-card/graph-display-card.component';
import { UIAlert } from '../../../../services/uiAlert';
import { UIHelper } from '../../../../services/uiHelper';
import { UILog } from '../../../../services/uiLog';
import { BrewModalImportShotMeticulousComponent } from '../brew-modal-import-shot-meticulous.component';

interface Entry {
  id: string;
  time: number;
  profile: { name: string };
}

@Component({
  selector: 'graph-display-card',
  template: '<div style="height: 100px"></div>',
})
class GraphStubComponent {
  public readonly chartWidth = input<number>();
  public readonly meticulousHistoryData = input<unknown>();
  public readonly meticulousDevice = input<unknown>();
}

const PAGE = MeticulousDevice.PAGE_SIZE;

/** `count` entries, newest first, older than `before`. */
function page(count: number, before = 1_000_000): Entry[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `shot-${before - i - 1}`,
    time: before - i - 1,
    profile: { name: 'Profile' },
  }));
}

/** Answers like the device, after a round trip. */
function answer<T>(value: T | Error): Promise<T> {
  return new Promise((resolve, reject) =>
    setTimeout(() => (value instanceof Error ? reject(value) : resolve(value))),
  );
}

describe('BrewModalImportShotMeticulousComponent', () => {
  let fixture: ComponentFixture<BrewModalImportShotMeticulousComponent>;
  let component: BrewModalImportShotMeticulousComponent;
  let getHistory: jasmine.Spy<(endDate?: number) => Promise<Entry[]>>;

  /** Lets the list render, measure, load and render again. */
  async function settle(): Promise<void> {
    for (let i = 0; i < 8; i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await fixture.whenStable();
    }
  }

  async function scroller(): Promise<HTMLElement> {
    const content = fixture.nativeElement.querySelector('ion-content') as {
      getScrollElement(): Promise<HTMLElement>;
    };
    return content.getScrollElement();
  }

  async function scrollTo(offset: number): Promise<void> {
    const element = await scroller();
    element.scrollTop = offset;
    element.dispatchEvent(new Event('scroll'));
    await settle();
  }

  async function open(height = 600): Promise<void> {
    fixture = TestBed.createComponent(BrewModalImportShotMeticulousComponent);
    component = fixture.componentInstance;
    component.meticulousDevice = { getHistory } as unknown as MeticulousDevice;
    const element = fixture.nativeElement as HTMLElement;
    element.style.cssText = `display: flex; flex-direction: column; height: ${height}px; width: 400px`;
    document.body.appendChild(element);
    fixture.autoDetectChanges();
    await settle();
  }

  beforeEach(() => {
    getHistory = jasmine.createSpy('getHistory');
    TestBed.overrideComponent(BrewModalImportShotMeticulousComponent, {
      remove: { imports: [GraphDisplayCardComponent] },
      add: { imports: [GraphStubComponent] },
    });
    TestBed.configureTestingModule({
      providers: [
        // As in the app: the component changes plain fields.
        provideZoneChangeDetection(),
        provideIonicAngular(),
        provideTranslateService(),
        { provide: ModalController, useValue: { dismiss: () => undefined } },
        {
          provide: UIAlert,
          useValue: {
            showLoadingSpinner: () => Promise.resolve(),
            hideLoadingSpinner: () => Promise.resolve(),
            showMessage: () => Promise.resolve(),
          },
        },
        { provide: UIHelper, useValue: { formatTimeNumber: () => '' } },
        { provide: UILog, useValue: { error: () => undefined } },
      ],
    });
  });

  afterEach(() => {
    fixture.nativeElement.remove();
    fixture.destroy();
  });

  it('loads the next pages while the list does not fill the screen', async () => {
    // One short page of shots each, until the device has no more.
    getHistory.and.callFake((before?: number) =>
      answer(
        before === undefined
          ? page(PAGE)
          : before > 1_000_000 - 3 * PAGE
            ? page(PAGE, before)
            : [],
      ),
    );
    // A screen taller than all shots.
    await open(100_000);

    // Shown to their end each time: loaded until none were left.
    expect(getHistory.calls.allArgs()).toEqual([
      [],
      [1_000_000 - PAGE],
      [1_000_000 - 2 * PAGE],
      [1_000_000 - 3 * PAGE],
    ]);
    expect(component.history.length).toBe(3 * PAGE);
    expect(component.hasMore).toBeFalse();
  });

  it('loads more when scrolled to the end, and again after an error', async () => {
    const entries = page(4 * PAGE);
    let failNext = false;
    getHistory.and.callFake((before?: number) => {
      if (failNext) {
        failNext = false;
        return answer<Entry[]>(new Error('Device not reachable'));
      }
      const from =
        before === undefined
          ? 0
          : entries.findIndex((entry) => entry.time < before);
      return answer(entries.slice(from, from + PAGE));
    });
    await open();
    // The first page fills the screen.
    expect(getHistory).toHaveBeenCalledTimes(1);

    failNext = true;
    await scrollTo(1_000_000);
    expect(getHistory).toHaveBeenCalledTimes(2);
    expect(component.history.length).toBe(PAGE);

    // Away from the end and back retries.
    await scrollTo(0);
    await scrollTo(1_000_000);
    expect(getHistory).toHaveBeenCalledTimes(3);
    expect(component.history.length).toBe(2 * PAGE);
  });

  it('draws the charts as wide as an entry', async () => {
    getHistory.and.callFake(() => answer(page(2)));
    await open();

    const item = fixture.nativeElement.querySelector('ion-item') as HTMLElement;
    expect(item.offsetWidth).toBeGreaterThan(50);
    expect(component.chartWidth()).toBe(item.offsetWidth - 50);
  });
});
