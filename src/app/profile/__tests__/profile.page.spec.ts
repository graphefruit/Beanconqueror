import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { defineCustomElement as defineIcon } from 'ionicons/components/ion-icon.js';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import de from '../../../assets/i18n/de.json';
import en from '../../../assets/i18n/en.json';
import { Mill } from '../../../classes/mill/mill';
import { Preparation } from '../../../classes/preparation/preparation';
import { Settings } from '../../../classes/settings/settings';
import { Water } from '../../../classes/water/water';
import LINK_TRACKING from '../../../data/tracking/linkTracking';
import { PREPARATION_TYPES } from '../../../enums/preparations/preparationTypes';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIHelper } from '../../../services/uiHelper';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIWaterStorage } from '../../../services/uiWaterStorage';
import { accessibleName } from '../../../test-utils';
import { AppComponent } from '../../app.component';
import { ProfilePage } from '../profile.page';

function archived<T extends { finished: boolean }>(entry: T): T {
  entry.finished = true;
  return entry;
}

function times<T>(count: number, create: () => T): T[] {
  return Array.from({ length: count }, create);
}

/** The hub's entries in their groups, so header and footer are left out. */
function entries(page: HTMLElement): HTMLElement[] {
  return [...page.querySelectorAll<HTMLElement>('ion-list ion-item')];
}

/** Names of the entries of a fresh install, title then description. */
const ENTRY_NAMES = [
  'Preparation methods None added yet',
  'Grinders None added yet',
  'Statistics Your brews and beans in numbers',
  'Brewing Parameters Which fields a brew records',
  'Bean parameters Which fields a bean records',
  'Calculations Brew ratio, water hardness',
  'More sections Roasting, water, graphs',
  'Settings Language, appearance, devices, backup',
  'Info & support Impressum, privacy, contact, logs',
];

describe('ProfilePage', () => {
  let settings: Settings;
  let preparations: Preparation[];
  let mills: Mill[];
  let waters: Water[];
  let trackEvent: jasmine.Spy;
  let openExternalWebpage: jasmine.Spy;
  let events: Record<
    'settings' | 'preparations' | 'mills' | 'waters',
    Subject<unknown>
  >;

  beforeEach(() => {
    settings = new Settings();
    preparations = [];
    mills = [];
    waters = [];
    trackEvent = jasmine.createSpy('trackEvent');
    openExternalWebpage = jasmine.createSpy('openExternalWebpage');
    events = {
      settings: new Subject(),
      preparations: new Subject(),
      mills: new Subject(),
      waters: new Subject(),
    };

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: UIAnalytics, useValue: { trackEvent } },
        { provide: UIHelper, useValue: { openExternalWebpage } },
        {
          provide: UISettingsStorage,
          useValue: {
            getSettings: () => settings,
            attachOnEvent: () => events.settings,
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
        {
          provide: UIWaterStorage,
          useValue: {
            getAllEntries: () => waters,
            attachOnEvent: () => events.waters,
          },
        },
      ],
    });
    useLanguage('en');
  });

  function useLanguage(language: 'en' | 'de'): void {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(language, language === 'en' ? en : de);
    translate.use(language);
  }

  function open() {
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();
    return fixture;
  }

  function render(): HTMLElement {
    return open().nativeElement as HTMLElement;
  }

  it('has a page heading, three groups and entries named by title and description', () => {
    const page = render();

    const headings = [...page.querySelectorAll('[role="heading"], h1, h2')];
    expect(
      headings.map((heading) => [
        heading.getAttribute('aria-level') ?? heading.tagName.slice(1),
        accessibleName(heading),
      ]),
    ).toEqual([
      ['1', 'Profile'],
      ['2', 'Equipment'],
      ['2', 'Sections'],
      ['2', 'App'],
    ]);
    expect(entries(page).map(accessibleName)).toEqual(ENTRY_NAMES);
    // The dot before "None added yet" is not read.
    for (const dot of page.querySelectorAll('.setup-dot')) {
      expect(dot.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('lists water as third entry of the equipment once switched on', () => {
    settings.show_water_section = true;
    const page = render();

    expect(entries(page).map(accessibleName)).toEqual([
      ...ENTRY_NAMES.slice(0, 2),
      'Water None added yet',
      ...ENTRY_NAMES.slice(2),
    ]);
  });

  it('names the entries with the glossary terms in German', () => {
    useLanguage('de');
    const page = render();

    const names = entries(page).map(accessibleName);
    for (const [index, term] of [
      [0, 'Zubereitungsmethoden'],
      [1, 'Mühlen'],
      [2, 'Statistiken'],
      [7, 'Einstellungen'],
    ] as const) {
      expect(names[index]).toMatch(new RegExp(`^${term} `));
    }
  });

  it('shows the icon of every entry', async () => {
    defineIcon();
    // The app registers its own icons at start; the page adds the others.
    (
      AppComponent.prototype as unknown as { addAllCustomIcons(): void }
    ).addAllCustomIcons();
    settings.show_water_section = true;
    settings.show_graph_section = true;
    settings.show_roasting_section = true;
    preparations = [sanremoYou()];
    const page = render();
    document.body.appendChild(page);

    try {
      const icons = [
        ...page.querySelectorAll<HTMLElement>('.entry-icon ion-icon'),
      ];
      expect(icons.length).toBe(ENTRY_NAMES.length + 4);
      const drawn = (icon: HTMLElement) =>
        (icon.shadowRoot?.querySelector('svg')?.childElementCount ?? 0) > 0;
      for (let wait = 0; wait < 1000 && !icons.every(drawn); wait++) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      for (const icon of icons) {
        expect(drawn(icon)).withContext(icon.getAttribute('name')).toBeTrue();
      }
    } finally {
      page.remove();
    }
  });

  it('opens each community link of the footer by its named button', () => {
    const page = render();

    const links = [...page.querySelectorAll<HTMLElement>('.social-link')];
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      'Instagram',
      'Facebook',
      'GitHub',
      'Discord',
    ]);
    for (const link of links) {
      link.click();
    }

    expect(openExternalWebpage.calls.allArgs()).toEqual([
      ['https://www.instagram.com/beanconqueror/'],
      ['https://www.facebook.com/Beanconqueror/'],
      ['https://github.com/graphefruit/Beanconqueror'],
      ['https://discord.gg/vDzA5dZjG8'],
    ]);
  });

  it('shows no count for a section without entries, so its entry shows the setup hint', () => {
    const page = open().componentInstance;

    expect(page.preparations).toBeUndefined();
    expect(page.mills).toBeUndefined();
    expect(page.waters).toBeUndefined();
  });

  it('counts one entry with the singular text and more with the plural text', () => {
    preparations = [new Preparation()];
    mills = times(2, () => new Mill());
    waters = times(3, () => new Water());

    const page = open().componentInstance;

    expect(page.preparations).toEqual({
      key: 'PROFILE_PREPARATIONS_COUNT_ONE',
      params: { count: 1 },
    });
    expect(page.mills).toEqual({
      key: 'PROFILE_MILLS_COUNT_OTHER',
      params: { count: 2 },
    });
    expect(page.waters).toEqual({
      key: 'PROFILE_WATERS_COUNT_OTHER',
      params: { count: 3 },
    });
  });

  it('only uses count texts that exist in English', () => {
    const keys: string[] = [];
    for (const count of [1, 2]) {
      preparations = times(count, () => new Preparation());
      mills = times(count, () => new Mill());
      waters = times(count, () => new Water());
      const page = open().componentInstance;
      keys.push(page.preparations.key, page.mills.key, page.waters.key);
    }

    const texts: Record<string, unknown> = en;
    for (const key of keys) {
      expect(typeof texts[key])
        .withContext(key)
        .toBe('string');
    }
  });

  it('leaves archived entries out of the counts', () => {
    preparations = [archived(new Preparation())];
    mills = [new Mill(), archived(new Mill())];
    waters = [archived(new Water()), new Water(), new Water()];

    const page = open().componentInstance;

    expect(page.preparations).toBeUndefined();
    expect(page.mills?.params.count).toBe(1);
    expect(page.waters?.params.count).toBe(2);
  });

  it('lists water only while the water section is switched on', () => {
    const page = open().componentInstance;
    expect(page.waterSectionVisible).toBeFalse();

    settings.show_water_section = true;
    events.settings.next(undefined);
    expect(page.waterSectionVisible).toBeTrue();

    settings.show_water_section = false;
    events.settings.next(undefined);
    expect(page.waterSectionVisible).toBeFalse();
  });

  function sanremoYou(): Preparation {
    const preparation = new Preparation();
    preparation.type = PREPARATION_TYPES.SANREMO_YOU;
    return preparation;
  }

  it('lists the barista mode while an active Sanremo YOU method exists', () => {
    preparations = [new Preparation(), archived(sanremoYou())];
    const page = open().componentInstance;
    expect(page.baristaMode).toBeUndefined();

    preparations.push(sanremoYou());
    events.preparations.next(undefined);
    expect(page.baristaMode?.link).toBe('/baristamode');

    archived(preparations[2]);
    events.preparations.next(undefined);
    expect(page.baristaMode).toBeUndefined();
  });

  it('lists graphs and roasting only while they are switched on, between the fixed sections and their switches', () => {
    const page = open().componentInstance;
    const fixed = [
      '/home/profile/statistic',
      '/home/profile/brew-parameter',
      '/home/profile/bean-parameter',
      '/helper',
    ];
    const switches = '/home/profile/sections';
    expect(page.sections.map((entry) => entry.link)).toEqual([
      ...fixed,
      switches,
    ]);

    settings.show_graph_section = true;
    settings.show_roasting_section = true;
    events.settings.next(undefined);
    expect(page.sections.map((entry) => entry.link)).toEqual([
      ...fixed,
      '/home/profile/graph',
      '/roasting-section',
      switches,
    ]);

    settings.show_graph_section = false;
    events.settings.next(undefined);
    expect(page.sections.map((entry) => entry.link)).toEqual([
      ...fixed,
      '/roasting-section',
      switches,
    ]);
  });

  it('only uses entry texts that exist in English', () => {
    preparations = [sanremoYou()];
    settings.show_graph_section = true;
    settings.show_roasting_section = true;
    const page = open().componentInstance;

    const texts: Record<string, unknown> = en;
    for (const entry of [
      page.baristaMode,
      ...page.sections,
      ...page.appEntries,
    ]) {
      for (const key of [entry.title, entry.description]) {
        expect(typeof texts[key])
          .withContext(key)
          .toBe('string');
      }
    }
  });

  it('opens a community link in the browser and counts the click', () => {
    const page = open().componentInstance;
    const discord = page.socialLinks.find((link) => link.name === 'Discord');

    page.openSocialLink(discord);

    expect(trackEvent).toHaveBeenCalledWith(
      LINK_TRACKING.TITLE,
      LINK_TRACKING.ACTIONS.DISCORD,
    );
    expect(openExternalWebpage).toHaveBeenCalledWith(
      'https://discord.gg/vDzA5dZjG8',
    );
  });

  it('updates a count when its section changes', () => {
    const page = open().componentInstance;

    preparations.push(new Preparation());
    events.preparations.next(undefined);
    expect(page.preparations?.params.count).toBe(1);

    mills.push(new Mill(), new Mill());
    events.mills.next(undefined);
    expect(page.mills?.params.count).toBe(2);

    waters.push(new Water());
    events.waters.next(undefined);
    expect(page.waters?.params.count).toBe(1);

    archived(mills[0]);
    events.mills.next(undefined);
    expect(page.mills?.params.count).toBe(1);
  });

  it('stops listening to the storages once it is closed', () => {
    const fixture = open();

    fixture.destroy();

    for (const [storage, subject] of Object.entries(events)) {
      expect(subject.observed).withContext(storage).toBeFalse();
    }
  });
});
