import { ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  TranslateModule,
  TranslatePipe,
  TranslateService,
} from '@ngx-translate/core';
import { Subject } from 'rxjs';

import de from '../../../assets/i18n/de.json';
import en from '../../../assets/i18n/en.json';
import { Bean } from '../../../classes/bean/bean';
import { Mill } from '../../../classes/mill/mill';
import { Preparation } from '../../../classes/preparation/preparation';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { accessibleName } from '../../../test-utils';
import { HomePage } from '../home.page';

const TEXTS = { en, de } as const;
type Language = keyof typeof TEXTS;

function archived<T extends { finished: boolean }>(entry: T): T {
  entry.finished = true;
  return entry;
}

/**
 * The tab bar of the app: four sections, and a red mark with words for
 * screen readers on a tab whose section misses something to brew with. The
 * Ionic tabs need the router outlet of the app, so the tab bar renders as
 * plain elements here; e2e/a11y-tabs.spec.ts checks it in the browser.
 */
describe('HomePage tab bar', () => {
  let beans: Bean[];
  let preparations: Preparation[];
  let mills: Mill[];
  let events: Record<'beans' | 'preparations' | 'mills', Subject<unknown>>;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(() => {
    beans = [new Bean()];
    preparations = [new Preparation()];
    mills = [new Mill()];
    events = {
      beans: new Subject(),
      preparations: new Subject(),
      mills: new Subject(),
    };
    TestBed.overrideComponent(HomePage, {
      set: { imports: [TranslatePipe], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        {
          provide: UIBeanStorage,
          useValue: {
            getAllEntries: () => beans,
            attachOnEvent: () => events.beans,
          },
        },
        {
          provide: UIPreparationStorage,
          useValue: {
            getAllEntries: () => preparations,
            attachOnEvent: () => events.preparations,
          },
        },
        {
          provide: UIMillStorage,
          useValue: {
            getAllEntries: () => mills,
            attachOnEvent: () => events.mills,
          },
        },
      ],
    });
  });

  function open(language: Language = 'en'): HTMLElement {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(language, TEXTS[language]);
    translate.use(language);
    fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  /**
   * A storage reports a change, as it does after a save. In the app the
   * zone's next round renders it; the test marks the page for that round.
   */
  function changed(storage: Subject<unknown>): void {
    storage.next(undefined);
    fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
  }

  function tabs(page: HTMLElement): HTMLElement[] {
    return [...page.querySelectorAll<HTMLElement>('ion-tab-button')];
  }

  /** The tabs by the names screen readers read. */
  function tabNames(page: HTMLElement): string[] {
    return tabs(page).map(accessibleName);
  }

  /** The tabs that show the red mark. */
  function marked(page: HTMLElement): string[] {
    return tabs(page)
      .filter((tab) => tab.querySelector('ion-badge'))
      .map((tab) => tab.getAttribute('tab'));
  }

  it('has the four main sections', () => {
    const page = open();

    expect(tabs(page).map((tab) => tab.getAttribute('tab'))).toEqual([
      'dashboard',
      'brews',
      'beans',
      'profile',
    ]);
    expect(tabNames(page)).toEqual(['Home', 'Brews', 'Beans', 'Profile']);
    expect(marked(page)).toEqual([]);
  });

  it('names the tabs with the glossary terms in German', () => {
    expect(tabNames(open('de'))).toEqual([
      'Home',
      'Brühungen',
      'Bohnen',
      'Profil',
    ]);
  });

  for (const language of ['en', 'de'] as const) {
    it(`says what a red mark means (${language})`, () => {
      beans = [archived(new Bean())];
      preparations = [archived(new Preparation())];
      const texts = TEXTS[language];
      const hint = (key: string, tab: string) =>
        texts.A11Y[key as keyof typeof texts.A11Y].replace('{{tab}}', tab);

      const page = open(language);

      expect(tabNames(page)).toEqual([
        texts.NAV_HOME,
        texts.NAV_BREWS,
        hint('TAB_HINT_NO_BEAN', texts.NAV_BEANS),
        hint('TAB_HINT_NO_PREPARATION_OR_MILL', texts.NAV_PROFILE),
      ]);
      // The mark is shown; only its words are read.
      const badges = [...page.querySelectorAll('ion-badge')];
      expect(badges.length).toBe(2);
      for (const badge of badges) {
        expect(badge.getAttribute('aria-hidden')).toBe('true');
        expect(badge.getAttribute('color')).toBe('danger');
      }
    });
  }

  it('marks the profile while a preparation method or a grinder is missing', () => {
    preparations = [];
    mills = [];
    const page = open();
    expect(marked(page)).toEqual(['profile']);

    preparations.push(new Preparation());
    changed(events.preparations);
    // Only the grinder is missing now, and the tab still says so.
    expect(marked(page)).toEqual(['profile']);

    mills.push(new Mill());
    changed(events.mills);
    expect(marked(page)).toEqual([]);
    expect(tabNames(page)[3]).toBe('Profile');
  });

  it('marks the profile while only the preparation method is missing', () => {
    preparations = [];
    expect(marked(open())).toEqual(['profile']);
  });

  it('marks the beans while no bean is active and leaves the mark once one is added', () => {
    beans = [archived(new Bean())];
    const page = open();
    expect(marked(page)).toEqual(['beans']);

    beans.push(new Bean());
    changed(events.beans);
    expect(marked(page)).toEqual([]);
  });
});
