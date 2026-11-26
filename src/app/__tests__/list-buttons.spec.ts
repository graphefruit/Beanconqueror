import { signal, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ModalController } from '@ionic/angular';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import de from '../../assets/i18n/de.json';
import en from '../../assets/i18n/en.json';
import { Settings } from '../../classes/settings/settings';
import { AppleIntelligenceAIBeanImportService } from '../../services/aiBeanImport/apple-intelligence-ai-bean-import.service';
import { CloudAIBeanImportService } from '../../services/aiBeanImport/cloud-ai-bean-import.service';
import { BeanSortFilterHelperService } from '../../services/beanSortFilterHelper/bean-sort-filter-helper.service';
import { IntentHandlerService } from '../../services/intentHandler/intent-handler.service';
import { NfcService } from '../../services/nfcService/nfc-service.service';
import { PreparationSortFilterHelperService } from '../../services/preparationSortFilterHelper/preparation-sort-filter-helper.service';
import { QrScannerService } from '../../services/qrScanner/qr-scanner.service';
import { UIAlert } from '../../services/uiAlert';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIBeanHelper } from '../../services/uiBeanHelper';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIFileHelper } from '../../services/uiFileHelper';
import { UIHelper } from '../../services/uiHelper';
import { UIImage } from '../../services/uiImage';
import { UILog } from '../../services/uiLog';
import { UIMillHelper } from '../../services/uiMillHelper';
import { UIMillStorage } from '../../services/uiMillStorage';
import { UIPreparationHelper } from '../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIWaterHelper } from '../../services/uiWaterHelper';
import { UIWaterStorage } from '../../services/uiWaterStorage';
import { BeanStore } from '../../stores/beans/bean.store';
import { BeansPage } from '../beans/beans.page';
import { BrewPage } from '../brew/brew.page';
import { MillPage } from '../mill/mill.page';
import { PreparationPage } from '../preparation/preparation.page';
import { WaterPage } from '../water-section/water/water.page';

/**
 * Every list adds its entries from a floating button, not from the header;
 * e2e/list-add-button.spec.ts and e2e/brew-add-button.spec.ts check where it
 * floats. Beans keep their import in the header, and beside it, as on Brews,
 * a gear leads to the fields the entries record.
 */

interface ListPage {
  name: string;
  page: Type<{ add(): Promise<void> }>;
  add: { en: string; de: string };
  /** The gear in the header, with the page it leads to. */
  gear?: { en: string; de: string; href: string };
}

const LISTS: ListPage[] = [
  {
    name: 'brews',
    page: BrewPage,
    add: { en: 'Add brew', de: 'Bezug hinzufügen' },
    gear: {
      en: 'Brewing Parameters',
      de: 'Bezugsparameter',
      href: '/home/brews/brew-parameter',
    },
  },
  {
    name: 'beans',
    page: BeansPage,
    add: { en: 'Add bean', de: 'Bohne hinzufügen' },
    gear: {
      en: 'Bean parameters',
      de: 'Bohnenparameter',
      href: '/home/beans/bean-parameter',
    },
  },
  {
    name: 'grinders',
    page: MillPage,
    add: { en: 'Add grinder', de: 'Mühle hinzufügen' },
  },
  {
    name: 'preparation methods',
    page: PreparationPage,
    add: { en: 'Add preparation method', de: 'Brühmethode hinzufügen' },
  },
  {
    name: 'water',
    page: WaterPage,
    add: { en: 'Add water recipe', de: 'Wasserrezept hinzufügen' },
  },
];

const none = () => new Subject<unknown>();

/** The services the list pages ask for when built, with an empty store. */
function providers() {
  const settings = new Settings();
  return [
    provideRouter([]),
    {
      provide: UISettingsStorage,
      useValue: { getSettings: () => settings },
    },
    {
      provide: UIBrewStorage,
      useValue: { attachOnEvent: none, getAllEntries: () => [] },
    },
    {
      provide: UIPreparationStorage,
      useValue: { attachOnEvent: none, getAllEntries: () => [] },
    },
    { provide: UIMillStorage, useValue: { getAllEntries: () => [] } },
    { provide: UIWaterStorage, useValue: { getAllEntries: () => [] } },
    {
      provide: BeanStore,
      useValue: { entries: signal([]), changes: none() },
    },
    { provide: UIAnalytics, useValue: { trackEvent: () => undefined } },
    ...[
      ModalController,
      UIHelper,
      UIAlert,
      UILog,
      UIImage,
      UIFileHelper,
      UIBrewHelper,
      UIBeanHelper,
      UIMillHelper,
      UIPreparationHelper,
      UIWaterHelper,
      PreparationSortFilterHelperService,
      BeanSortFilterHelperService,
      QrScannerService,
      IntentHandlerService,
      NfcService,
      AppleIntelligenceAIBeanImportService,
      CloudAIBeanImportService,
    ].map((provide) => ({ provide, useValue: {} })),
  ];
}

describe('the buttons of the lists', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: providers(),
    });
  });

  function useLanguage(language: 'en' | 'de'): void {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(language, language === 'en' ? en : de);
    translate.use(language);
  }

  function render<T>(page: Type<T>) {
    const fixture = TestBed.createComponent(page);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    return {
      page: fixture.componentInstance,
      header: element.querySelector('ion-header'),
      fab: element.querySelectorAll<HTMLElement>('ion-fab ion-fab-button'),
    };
  }

  /** The names of the header's buttons and links. */
  function headerNames(header: Element): string[] {
    return [
      ...header.querySelectorAll('app-header ion-button, app-header a'),
    ].map((button) => button.getAttribute('aria-label'));
  }

  for (const list of LISTS) {
    it(`${list.name}: the add button floats, named, and adds`, () => {
      useLanguage('en');
      const { page, header, fab } = render(list.page);

      expect(fab.length).toBe(1);
      expect(fab[0].getAttribute('aria-label')).toBe(list.add.en);
      expect(headerNames(header)).not.toContain(list.add.en);
      const add = spyOn(page, 'add').and.resolveTo();
      fab[0].click();
      expect(add).toHaveBeenCalledTimes(1);
    });

    it(`${list.name}: the add button is named in German`, () => {
      useLanguage('de');
      const { fab } = render(list.page);

      expect(fab[0].getAttribute('aria-label')).toBe(list.add.de);
    });

    if (list.gear) {
      const gear = list.gear;
      it(`${list.name}: the gear in the header leads to the ${gear.en}`, () => {
        for (const language of ['en', 'de'] as const) {
          useLanguage(language);
          const { header } = render(list.page);

          const link = header.querySelector<HTMLElement>(
            `ion-button[aria-label="${gear[language]}"]`,
          );
          expect(link).withContext(language).not.toBeNull();
          expect(link.getAttribute('href')).toBe(gear.href);
        }
      });
    }
  }

  it('beans: the import stays in the header', () => {
    useLanguage('en');
    const { page, header } = render(BeansPage);

    const importBeans = header.querySelector<HTMLElement>(
      'app-header ion-button[aria-label="Import beans"]',
    );
    expect(importBeans).not.toBeNull();
    const open = spyOn(page, 'openImportMenu').and.resolveTo();
    importBeans.click();
    expect(open).toHaveBeenCalledTimes(1);
  });
});
