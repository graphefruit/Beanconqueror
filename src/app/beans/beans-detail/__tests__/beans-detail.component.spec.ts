import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';
import { defineCustomElement as defineSegmentButton } from '@ionic/core/components/ion-segment-button.js';
import { defineCustomElement as defineSegment } from '@ionic/core/components/ion-segment.js';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import en from '../../../../assets/i18n/en.json';
import { Bean } from '../../../../classes/bean/bean';
import { Settings } from '../../../../classes/settings/settings';
import { IBean } from '../../../../interfaces/bean/iBean';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../../services/uiBeanStorage';
import { UIHelper } from '../../../../services/uiHelper';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { BeansDetailComponent } from '../beans-detail.component';

const NOW = Date.parse('2026-03-01T08:00:00.000Z');
const DAY = 86_400_000;

/** Ionic renders and marks the selection asynchronously. */
async function until(condition: () => boolean): Promise<void> {
  for (let frame = 0; frame < 120 && !condition(); frame++) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

/** Text as a reader gets it: whitespace collapsed. */
function readable(element: Element): string {
  return (element.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('BeansDetailComponent', () => {
  let settings: Settings;

  beforeAll(() => {
    defineSegment();
    defineSegmentButton();
  });

  beforeEach(() => {
    settings = new Settings();
    settings.freeze_coffee_beans = true;
    settings.date_format = 'DD.MM.YYYY';

    TestBed.configureTestingModule({
      imports: [BeansDetailComponent, TranslateModule.forRoot()],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ModalController, useValue: { dismiss: () => undefined } },
        {
          provide: UIHelper,
          useValue: {
            copyData: (data: unknown): unknown =>
              JSON.parse(JSON.stringify(data)) as unknown,
          },
        },
        { provide: UIAnalytics, useValue: { trackEvent: () => undefined } },
        {
          provide: UIBeanHelper,
          useValue: {
            fieldVisible: (field: boolean) =>
              UIBeanHelper.prototype.fieldVisible(field),
          },
        },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => settings },
        },
        { provide: UIBeanStorage, useValue: {} },
      ],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', en);
    translate.use('en');
  });

  /** Opens the details of `bean` on the tab `segment`. */
  async function open(
    bean: IBean,
    segment: string,
  ): Promise<ComponentFixture<BeansDetailComponent>> {
    const fixture = TestBed.createComponent(BeansDetailComponent);
    fixture.componentRef.setInput('bean', bean);
    fixture.componentInstance.bean_segment = segment;
    fixture.autoDetectChanges();
    await fixture.whenStable();
    fixture.componentInstance.ionViewDidEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  it('shows when a frozen bean was frozen and thawed, but not its frozen id', async () => {
    const thawed = new Bean();
    Object.assign(thawed, {
      name: 'Theta Aufgetaut',
      roastingDate: new Date(NOW - 120 * DAY).toISOString(),
      frozenDate: new Date(NOW - 100 * DAY).toISOString(),
      unfrozenDate: new Date(NOW - 5 * DAY).toISOString(),
      frozenId: 'TA1',
    });
    thawed.config.uuid = 'thawed';
    const stored = JSON.parse(JSON.stringify(thawed)) as IBean;

    const fixture = await open(stored, 'frozen');
    const element = fixture.nativeElement as HTMLElement;
    const panel = element.querySelector('[appTabPanel]');
    const tab = element.querySelector('ion-segment-button[value="frozen"]');
    await until(() => panel.getAttribute('aria-labelledby') === tab.id);

    expect(panel.getAttribute('role')).toBe('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
    expect(readable(tab)).toBe('Frozen information');
    // Each field is a label above its value.
    expect(
      [...panel.querySelectorAll('ion-item')].map((item) =>
        [...item.querySelectorAll('ion-label > *')].map(readable),
      ),
    ).toEqual([
      ['Frozen date:', '21.11.2025'],
      ['Unfrozen date:', '24.02.2026'],
      ['Freezing storage type:', 'Unknown'],
      ['Frozen notes:', ''],
    ]);
    // As laid out, so each field and value is read on its own.
    expect((panel as HTMLElement).innerText.replace(/\s+/g, ' ').trim()).toBe(
      'Frozen date: 21.11.2025 Unfrozen date: 24.02.2026 Freezing storage type: Unknown Frozen notes:',
    );
    // The id of the frozen bag, which the card shows, is missing here.
    expect(element.textContent).not.toContain('TA1');
  });
});
