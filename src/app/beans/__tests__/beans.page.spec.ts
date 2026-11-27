import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ModalController, Platform } from '@ionic/angular';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { cloneDeep } from 'lodash';
import { Subject } from 'rxjs';

import en from '../../../assets/i18n/en.json';
import { Bean } from '../../../classes/bean/bean';
import { Settings } from '../../../classes/settings/settings';
import { BeanInformationComponent } from '../../../components/bean-information/bean-information.component';
import { BeanGroup } from '../../../interfaces/bean/beanGroup';
import { IBean } from '../../../interfaces/bean/iBean';
import { AppleIntelligenceAIBeanImportService } from '../../../services/aiBeanImport/apple-intelligence-ai-bean-import.service';
import { CloudAIBeanImportService } from '../../../services/aiBeanImport/cloud-ai-bean-import.service';
import { IntentHandlerService } from '../../../services/intentHandler/intent-handler.service';
import { NfcService } from '../../../services/nfcService/nfc-service.service';
import { QrScannerService } from '../../../services/qrScanner/qr-scanner.service';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIHelper } from '../../../services/uiHelper';
import { UIImage } from '../../../services/uiImage';
import { UILog } from '../../../services/uiLog';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { BeanUsageStore } from '../../../stores/beans/bean-usage.store';
import { BeanStore } from '../../../stores/beans/bean.store';
import { BeansPage } from '../beans.page';

/** The list only needs to know which bean a row is. */
@Component({
  selector: 'bean-information',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '{{ bean().name }}',
})
class FakeBeanCardComponent {
  public readonly bean = input.required<Bean>();
  public readonly beanGroup = input<BeanGroup>();
  public readonly collapsed = input(false);
  public readonly groupExpanded = input(false);
  public readonly beanAction = output<unknown>();
  public readonly groupToggled = output<void>();
}

function storedBean(name: string, fields: Partial<IBean> = {}): IBean {
  const bean = new Bean();
  Object.assign(bean, { name, ...fields });
  bean.config.uuid = name;
  return JSON.parse(JSON.stringify(bean)) as IBean;
}

const FROZEN = '2025-08-13T08:00:00.000Z';

/** The beans of the E2E data set, in every state the list knows. */
const BEANS: IBean[] = [
  storedBean('Alpha Filter', { favourite: true }),
  storedBean('Äthiopien Natural'),
  storedBean('Gamma Blend'),
  storedBean('Delta Minus'),
  storedBean('Epsilon Rest'),
  // What is left of a bag that was frozen in three portions.
  storedBean('Zeta Original', { frozenGroupId: 'zeta' }),
  ...['ZP1', 'ZP2', 'ZP3'].map((frozenId) =>
    storedBean(`Zeta Portion ${frozenId}`, {
      frozenDate: FROZEN,
      frozenId,
      frozenGroupId: 'zeta',
    }),
  ),
  storedBean('Eta Frost', { frozenDate: FROZEN, frozenId: 'EF1' }),
  storedBean('Theta Aufgetaut', {
    frozenDate: FROZEN,
    unfrozenDate: '2026-02-24T08:00:00.000Z',
    frozenId: 'TA1',
  }),
  storedBean('Iota Archiv', { finished: true }),
  storedBean('Kappa Archiv Frost', {
    finished: true,
    frozenDate: FROZEN,
    frozenId: 'KA1',
  }),
  storedBean('Lambda Archiv', {
    finished: true,
    frozenDate: FROZEN,
    frozenId: 'LA1',
  }),
];

/** Text as a reader gets it: whitespace collapsed. */
function readable(element: Element | null): string {
  return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('BeansPage', () => {
  let settings: Settings;
  let entries: ReturnType<typeof signal<IBean[]>>;

  beforeEach(() => {
    settings = new Settings();
    entries = signal<IBean[]>([]);
    TestBed.configureTestingModule({
      imports: [BeansPage, TranslateModule.forRoot()],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: BeanStore,
          useValue: { entries, changes: new Subject<void>() },
        },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => settings },
        },
        {
          provide: UIHelper,
          useValue: { cloneData: <T>(value: T): T => cloneDeep(value) },
        },
        { provide: Platform, useValue: { is: () => false } },
        ...[
          UILog,
          UIAnalytics,
          QrScannerService,
          IntentHandlerService,
          UIBeanHelper,
          ModalController,
          NfcService,
          UIImage,
          AppleIntelligenceAIBeanImportService,
          CloudAIBeanImportService,
          UIAlert,
          UIFileHelper,
          BeanUsageStore,
        ].map((provide) => ({ provide, useValue: {} })),
      ],
    });
    TestBed.overrideComponent(BeansPage, {
      remove: { imports: [BeanInformationComponent] },
      add: { imports: [FakeBeanCardComponent] },
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', en);
    translate.use('en');
  });

  async function enter(): Promise<ComponentFixture<BeansPage>> {
    const fixture = TestBed.createComponent(BeansPage);
    fixture.componentInstance.ionViewWillEnter();
    fixture.autoDetectChanges();
    await fixture.whenStable();
    return fixture;
  }

  async function show(
    fixture: ComponentFixture<BeansPage>,
    segment: 'open' | 'frozen' | 'archive',
  ): Promise<void> {
    fixture.componentInstance.segment.set(segment);
    fixture.componentInstance.segmentChanged();
    await fixture.whenStable();
  }

  /** The name each segment tab is read with, by its value. */
  function tabs(fixture: ComponentFixture<BeansPage>): Record<string, string> {
    const element = fixture.nativeElement as HTMLElement;
    return Object.fromEntries(
      [...element.querySelectorAll('ion-segment-button')].map((tab) => [
        tab.getAttribute('value'),
        readable(tab.querySelector('.visually-hidden')),
      ]),
    );
  }

  /** The names of the beans in the list shown, a group by its first bean. */
  function listed(fixture: ComponentFixture<BeansPage>): string[] {
    return fixture.componentInstance
      .shownRows()
      .map((row) => ('beans' in row ? row.beans[0] : row).name);
  }

  /** The search field and the names of the buttons next to it. */
  async function toolbar(fixture: ComponentFixture<BeansPage>) {
    const element = fixture.nativeElement as HTMLElement;
    // Ionic moves the name of ion-button to the button in its shadow root.
    await new Promise((resolve) => setTimeout(resolve));
    return {
      search: element.querySelector('ion-searchbar') !== null,
      buttons: [...element.querySelectorAll('.list-head ion-button')].map(
        (button) =>
          button.shadowRoot
            ?.querySelector('button')
            ?.getAttribute('aria-label') ?? button.getAttribute('aria-label'),
      ),
    };
  }

  describe('with beans in every state', () => {
    beforeEach(() => {
      settings.freeze_coffee_beans = true;
      entries.set(BEANS);
    });

    it('counts the available, frozen and archived beans in the segments', async () => {
      const fixture = await enter();

      // Known defect: the three frozen portions are one entry, so the counter
      // reads "shown / all" as if a filter hid two of four beans.
      expect(tabs(fixture)).toEqual({
        open: 'Available, 7 in total',
        frozen: 'Frozen, 2 of 4 shown',
        archive: 'Archive, 3 in total',
      });
    });

    it('lists the frozen portions of one bag as one group', async () => {
      const fixture = await enter();
      await show(fixture, 'frozen');

      const rows = fixture.componentInstance.shownRows();
      expect(rows.length).toBe(2);
      const group = rows.find((row): row is BeanGroup => 'beans' in row);
      expect(group.frozenGroupId).toBe('zeta');
      expect(group.beans.map((bean) => bean.frozenId)).toEqual([
        'ZP1',
        'ZP2',
        'ZP3',
      ]);
      // The bag it came from is available, not part of the group.
      await show(fixture, 'open');
      expect(listed(fixture)).toContain('Zeta Original');
    });

    it('lists archived beans in the archive only, frozen or not', async () => {
      const fixture = await enter();

      await show(fixture, 'archive');
      expect(listed(fixture)).toEqual([
        'Iota Archiv',
        'Kappa Archiv Frost',
        'Lambda Archiv',
      ]);

      await show(fixture, 'frozen');
      expect(listed(fixture)).not.toContain('Kappa Archiv Frost');
      await show(fixture, 'open');
      expect(listed(fixture)).not.toContain('Kappa Archiv Frost');
    });

    it('hides the archive when archived beans are switched off', async () => {
      settings.show_archived_beans = false;
      const fixture = await enter();

      expect(Object.keys(tabs(fixture))).toEqual(['open', 'frozen']);
      await show(fixture, 'frozen');
      expect(fixture.componentInstance.shownRows().length).toBe(2);
      expect(listed(fixture)).not.toContain('Kappa Archiv Frost');
    });
  });

  it('shows no frozen segment and empty lists without a toolbar after a fresh install', async () => {
    const fixture = await enter();
    const element = fixture.nativeElement as HTMLElement;

    expect(tabs(fixture)).toEqual({
      open: 'Available, 0 in total',
      archive: 'Archive, 0 in total',
    });
    expect(readable(element.querySelector('ion-content'))).toBe(
      "You're out of fresh beans!",
    );
    expect(await toolbar(fixture)).toEqual({ search: false, buttons: [] });

    await show(fixture, 'archive');

    expect(readable(element.querySelector('ion-content'))).toBe(
      "You've got no archived beans.",
    );
    expect((await toolbar(fixture)).search).toBeFalse();
  });

  it('shows the search field and the filter once there is a bean', async () => {
    entries.set([storedBean('Alpha Filter')]);
    const fixture = await enter();

    expect(await toolbar(fixture)).toEqual({
      search: true,
      buttons: ['Filter beans', 'Sort beans', 'Collapse bean list items'],
    });
  });
});
