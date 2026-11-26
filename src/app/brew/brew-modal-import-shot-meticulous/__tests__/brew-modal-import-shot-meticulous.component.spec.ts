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
  host: { style: 'display: block' },
})
class GraphStubComponent {
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
  let getHistoryEntryDetails: jasmine.Spy;
  let dismiss: jasmine.Spy;
  let showMessage: jasmine.Spy;

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
    component.meticulousDevice = {
      getHistory,
      getHistoryEntryDetails,
    } as unknown as MeticulousDevice;
    const element = fixture.nativeElement as HTMLElement;
    element.style.cssText = `display: flex; flex-direction: column; height: ${height}px; width: 400px`;
    document.body.appendChild(element);
    fixture.autoDetectChanges();
    await settle();
  }

  beforeEach(() => {
    getHistory = jasmine.createSpy('getHistory');
    getHistoryEntryDetails = jasmine.createSpy('getHistoryEntryDetails');
    dismiss = jasmine.createSpy('dismiss');
    showMessage = jasmine.createSpy('showMessage').and.resolveTo();
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
        { provide: ModalController, useValue: { dismiss } },
        {
          provide: UIAlert,
          useValue: {
            showLoadingSpinner: () => Promise.resolve(),
            hideLoadingSpinner: () => Promise.resolve(),
            showMessage,
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

  it('keeps the charts within an entry', async () => {
    getHistory.and.callFake(() => answer(page(2)));
    await open();

    const item = fixture.nativeElement.querySelector('ion-item') as HTMLElement;
    const chart = item
      .querySelector('graph-display-card')
      .getBoundingClientRect();
    expect(chart.width).toBeGreaterThan(50);
    expect(chart.right).toBeLessThanOrEqual(item.getBoundingClientRect().right);
  });

  it('tells when the shots cannot be read', async () => {
    getHistory.and.callFake(() =>
      answer<Entry[]>(new Error('Device not reachable')),
    );
    await open();

    expect(showMessage).toHaveBeenCalledOnceWith(
      'PREPARATION_DEVICE.TYPE_METICULOUS.DATA_COULD_NOT_BE_LOADED',
      'ERROR_OCCURED',
      undefined,
      true,
    );
    expect(component.history).toEqual([]);
  });

  it('hands back the chosen shot with its data', async () => {
    getHistory.and.callFake(() => answer(page(2)));
    getHistoryEntryDetails.and.callFake(() => answer({ data: { weight: 36 } }));
    await open();

    component.radioSelection = 'shot-999998';
    await component.choose();

    expect(getHistoryEntryDetails).toHaveBeenCalledOnceWith('shot-999998');
    expect(dismiss).toHaveBeenCalledOnceWith(
      {
        choosenHistory: jasmine.objectContaining({
          id: 'shot-999998',
          data: { weight: 36 },
        }),
        dismissed: true,
      },
      undefined,
      BrewModalImportShotMeticulousComponent.COMPONENT_ID,
    );
  });

  it('closes without a shot', async () => {
    getHistory.and.callFake(() => answer(page(2)));
    await open();

    component.dismiss();

    expect(dismiss).toHaveBeenCalledOnceWith(
      { dismissed: true },
      undefined,
      BrewModalImportShotMeticulousComponent.COMPONENT_ID,
    );
  });

  // A desktop or a tablet with a mouse draws a scrollbar that takes width
  // (src/test.ts hides it for the other tests).
  describe('with a classic scrollbar', () => {
    let scrollbars: HTMLStyleElement;

    beforeEach(() => {
      scrollbars = document.createElement('style');
      scrollbars.textContent = `
        *, ion-content::part(scroll) { scrollbar-width: auto !important; }
        ion-content::part(scroll)::-webkit-scrollbar { width: 15px; }`;
      document.head.append(scrollbars);
    });

    afterEach(() => scrollbars.remove());

    it('loads more at the end and draws the charts beside the scrollbar', async () => {
      // As the scrollbar comes or goes, the rows change their width within
      // the frame the observers report in; Chrome reports the rest in the
      // next frame and says so in an error event, which is no failure.
      await jasmine.spyOnGlobalErrorsAsync(async (globalErrors) => {
        const entries = page(3 * PAGE);
        getHistory.and.callFake((before?: number) => {
          const from =
            before === undefined
              ? 0
              : entries.findIndex((entry) => entry.time < before);
          return answer(entries.slice(from, from + PAGE));
        });
        await open();
        const element = await scroller();
        expect(element.offsetWidth - element.clientWidth).toBe(15);

        await scrollTo(1_000_000);
        await scrollTo(1_000_000);

        expect(getHistory).toHaveBeenCalledTimes(3);
        expect(component.history.length).toBe(3 * PAGE);
        const item = fixture.nativeElement.querySelector(
          'ion-item',
        ) as HTMLElement;
        expect(item.getBoundingClientRect().right).toBeLessThanOrEqual(
          element.getBoundingClientRect().left + element.clientWidth,
        );
        for (const [error] of globalErrors.calls.allArgs()) {
          expect(String(error)).toContain('ResizeObserver loop');
        }
      });
    });
  });
});
