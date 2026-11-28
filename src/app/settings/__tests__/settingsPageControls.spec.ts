import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import {
  AlertController,
  ModalController,
  NavController,
  Platform,
} from '@ionic/angular';
import { defineCustomElement as defineCheckbox } from '@ionic/core/components/ion-checkbox.js';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import de from '../../../assets/i18n/de.json';
import en from '../../../assets/i18n/en.json';
import { Settings } from '../../../classes/settings/settings';
import { environment } from '../../../environments/environment';
import { BrewReferencesService } from '../../../services/brewReferences/brew-references.service';
import { CoffeeBluetoothDevicesService } from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { CurrencyService } from '../../../services/currencyService/currency.service';
import { EventQueueService } from '../../../services/queueService/queue-service.service';
import { TextToSpeechService } from '../../../services/textToSpeech/text-to-speech.service';
import { ThemeService } from '../../../services/theme/theme.service';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBaristamodeBrewStorage } from '../../../services/uiBaristamodeBrewStorage';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIExcel } from '../../../services/uiExcel';
import { UIExportImportHelper } from '../../../services/uiExportImportHelper';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIGraphStorage } from '../../../services/uiGraphStorage.service';
import { UIGreenBeanStorage } from '../../../services/uiGreenBeanStorage';
import { UIHealthKit } from '../../../services/uiHealthKit';
import { UIHelper } from '../../../services/uiHelper';
import { UILog } from '../../../services/uiLog';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UIRoastingMachineStorage } from '../../../services/uiRoastingMachineStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIToast } from '../../../services/uiToast';
import { UIUpdate } from '../../../services/uiUpdate';
import { UiVersionStorage } from '../../../services/uiVersionStorage';
import { UIWaterStorage } from '../../../services/uiWaterStorage';
import { VisualizerService } from '../../../services/visualizerService/visualizer-service.service';
import { StoreHub } from '../../../stores/core/store-hub';
import { accessibleName } from '../../../test-utils';
import { SettingsPage } from '../settings.page';

/**
 * The rendered settings page: names, descriptions and states of its
 * checkboxes, the info icons, and which speech settings are shown.
 */

/** Answers every call and property with itself, for the services the shown controls do not use. */
function anything(): unknown {
  const stub: unknown = new Proxy(() => stub, {
    get: (_target, key) => (key === 'then' ? undefined : stub),
  });
  return stub;
}

const STORAGES = [
  UIPreparationStorage,
  UIBeanStorage,
  UIBrewStorage,
  UIBaristamodeBrewStorage,
  UIGraphStorage,
  UIMillStorage,
  UIRoastingMachineStorage,
  UIGreenBeanStorage,
  UIWaterStorage,
];

const UNUSED = [
  AlertController,
  ModalController,
  NavController,
  UILog,
  UIAnalytics,
  UIUpdate,
  BrewReferencesService,
  UiVersionStorage,
  UIExcel,
  CoffeeBluetoothDevicesService,
  UIToast,
  EventQueueService,
  UIFileHelper,
  UIExportImportHelper,
  StoreHub,
  VisualizerService,
  ThemeService,
  UIHelper,
];

/** Ionic renders its controls asynchronously. */
async function until(condition: () => boolean): Promise<void> {
  for (let frame = 0; frame < 120 && !condition(); frame++) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

/**
 * The name a screen reader reads: Ionic's aria-labelledby points into its
 * shadow root and is not followed, so aria-label or else the slotted text.
 */
function nameOf(element: Element): string {
  return element.getAttribute('aria-label') ?? accessibleName(element);
}

describe('SettingsPage rendered', () => {
  const production = environment.production;
  let settings: Settings;
  let platforms: string[];
  let showMessage: jasmine.Spy;
  let saveSettings: jasmine.Spy;
  let fixture: ComponentFixture<SettingsPage>;

  beforeAll(() => {
    defineCheckbox();
  });

  beforeEach(() => {
    settings = new Settings();
    platforms = [];
    showMessage = jasmine.createSpy('showMessage').and.resolveTo();
    // pnpm e2e serves the development build, which keeps pitch and rate.
    environment.production = false;
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        ...STORAGES.map((token) => ({
          provide: token,
          useValue: { getAllEntries: () => [] },
        })),
        ...UNUSED.map((token) => ({ provide: token, useValue: anything() })),
        {
          provide: Platform,
          useValue: { is: (name: string) => platforms.includes(name) },
        },
        { provide: UIAlert, useValue: { showMessage } },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => settings },
        },
        { provide: CurrencyService, useValue: { getCurrencies: () => ({}) } },
        {
          provide: UIHealthKit,
          useValue: { isAvailable: () => Promise.reject(new Error('none')) },
        },
        { provide: TextToSpeechService, useValue: { available: true } },
      ],
    });
  });

  afterEach(() => {
    environment.production = production;
  });

  function t(key: string, params?: Record<string, string>): string {
    return TestBed.inject(TranslateService).instant(key, params) as string;
  }

  async function render(language: 'en' | 'de' = 'en'): Promise<HTMLElement> {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(language, language === 'en' ? en : de);
    translate.use(language);
    fixture = TestBed.createComponent(SettingsPage);
    saveSettings = spyOn(fixture.componentInstance, 'saveSettings');
    saveSettings.and.resolveTo();
    await settle();
    return fixture.nativeElement as HTMLElement;
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    await until(() =>
      [...page.querySelectorAll('ion-checkbox')].every(
        (each) => each.getAttribute('role') === 'checkbox',
      ),
    );
    // The names are set once Ionic has rendered.
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  }

  function checkboxes(page: HTMLElement): HTMLElement[] {
    return [...page.querySelectorAll<HTMLElement>('ion-checkbox')];
  }

  function checkbox(page: HTMLElement, name: string): HTMLElement | undefined {
    const found = checkboxes(page).filter((each) => nameOf(each) === name);
    expect(found.length).withContext(name).toBeLessThanOrEqual(1);
    return found[0];
  }

  function description(page: HTMLElement, element: Element): string {
    return (element.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .map((id) => (id ? page.querySelector(`[id="${id}"]`) : null))
      .map((each) => each?.textContent.trim() ?? '')
      .join(' ')
      .trim();
  }

  async function tap(element: HTMLElement): Promise<void> {
    const before = element.getAttribute('aria-checked');
    element.click();
    await settle();
    await until(() => element.getAttribute('aria-checked') !== before);
  }

  for (const language of ['en', 'de'] as const) {
    describe(language, () => {
      it('makes analytics one checkbox that says it opens a question', async () => {
        const page = await render(language);
        const name = t('PAGE_SETTINGS_ANALYTICS_INFORMATION');

        const analytics = checkbox(page, name);
        expect(analytics).toBeDefined();
        expect(
          [...page.querySelectorAll('[role="button"], button, ion-button')]
            .map(nameOf)
            .filter((each) => each.includes(name)),
        ).toEqual([]);
        // TalkBack and VoiceOver read a description; aria-haspopup is not allowed on a checkbox.
        expect(description(page, analytics)).toBe(t('A11Y.OPENS_QUESTION'));
        expect(analytics.hasAttribute('aria-haspopup')).toBeFalse();
        expect(analytics.getAttribute('aria-checked')).toBe('false');
      });

      it('names the archive checkboxes of the statistics after their section', async () => {
        const page = await render(language);

        for (const key of [
          'PAGE_SETTINGS_SHOW_ARCHIVED_PREPARATIONS',
          'PAGE_SETTINGS_SHOW_ARCHIVED_MILLS',
        ]) {
          expect(checkbox(page, t(key)))
            .withContext(key)
            .toBeDefined();
          expect(
            checkbox(
              page,
              `${t(key)}, ${t('PAGE_SETTINGS_MANAGE_STATISTICS')}`,
            ),
          )
            .withContext(key)
            .toBeDefined();
        }
      });

      it('names checkboxes by their title and describes them by their explanation', async () => {
        const page = await render(language);

        const coordinates = checkbox(
          page,
          t('PAGE_SETTINGS_TRACK_BREW_COORDINATES'),
        );
        expect(coordinates).toBeDefined();
        expect(description(page, coordinates)).toBe(
          t('PAGE_SETTINGS_TRACK_BREW_COORDINATES_DESCRIPTION'),
        );
        for (const each of checkboxes(page)) {
          const name = each.getAttribute('aria-label') ?? '';
          expect(name.length).withContext(name).toBeLessThanOrEqual(80);
        }
      });

      it('makes an info icon a button named after its topic that opens by keyboard', async () => {
        const page = await render(language);
        const name = t('A11Y.MORE_INFORMATION_ABOUT', {
          topic: t('PAGE_SETTINGS_IMAGE_QUALITY'),
        });

        const info = [
          ...page.querySelectorAll<HTMLElement>('[role="button"]'),
        ].filter((each) => nameOf(each) === name);
        expect(info.length).toBe(1);
        for (const key of ['Enter', ' ']) {
          showMessage.calls.reset();
          info[0].dispatchEvent(
            new KeyboardEvent('keydown', { key, cancelable: true }),
          );
          expect(showMessage.calls.allArgs())
            .withContext(key)
            .toEqual([[t('PAGE_SETTINGS_IMAGE_QUALITY_TOOLTIP')]]);
        }
        expect(
          [...page.querySelectorAll('[role="img"]')]
            .map(nameOf)
            .filter((each) => each === t('MORE_INFORMATION')),
        ).toEqual([]);
      });
    });
  }

  it('switches a settings checkbox on and off and saves it', async () => {
    const page = await render();
    const fastRepeat = checkbox(page, t('PAGE_SETTINGS_FAST_REPEAT'));
    expect(fastRepeat.getAttribute('aria-checked')).toBe('false');

    await tap(fastRepeat);
    expect(fastRepeat.getAttribute('aria-checked')).toBe('true');
    expect(settings.fast_brew_repeat).toBeTrue();
    expect(saveSettings).toHaveBeenCalledTimes(1);

    await tap(fastRepeat);
    expect(fastRepeat.getAttribute('aria-checked')).toBe('false');
    expect(settings.fast_brew_repeat).toBeFalse();
    expect(saveSettings).toHaveBeenCalledTimes(2);
  });

  it('no longer repeats the switches of the sections', async () => {
    const page = await render();

    expect(
      [...page.querySelectorAll('ion-select [slot="label"]')].map(nameOf),
    ).toContain(t('PAGE_SETTINGS_LANGUAGE'));
    expect(accessibleName(page)).not.toContain(
      t('PAGE_SETTINGS_MANAGE_SECTIONS'),
    );
    expect(
      checkboxes(page)
        .map(nameOf)
        .filter((name) => /^Activate .* section$/.test(name)),
    ).toEqual([]);
  });

  describe('speech', () => {
    /** The texts of the speech card: labels of its sliders, their values and its hints. */
    function shown(page: HTMLElement): string[] {
      const card = [...page.querySelectorAll('ion-card')].find((each) =>
        each.textContent.includes(t('PAGE_SETTINGS_TEXT_TO_SPEECH_SECTION')),
      );
      return [...card.querySelectorAll('p, .ion-label[slot="end"]')].map(
        (each) => each.textContent.trim(),
      );
    }

    function state(page: HTMLElement, key: string): string | undefined {
      return checkbox(page, t(key))?.getAttribute('aria-checked');
    }

    async function openSpeech(): Promise<HTMLElement> {
      const page = await render();
      await tap(checkbox(page, t('TEXT_TO_SPEECH.ACTIVATE')));
      return page;
    }

    it('on Android offers a switch for each brew value as before, with the hints and the voice', async () => {
      platforms = ['android'];
      const page = await openSpeech();

      // The spoken values of the versions before: weight, time every 5 s, start and end.
      expect(state(page, 'TEXT_TO_SPEECH.WEIGHT')).toBe('true');
      expect(state(page, 'TEXT_TO_SPEECH.WHOLE_GRAMS')).toBe('false');
      expect(state(page, 'TEXT_TO_SPEECH.BREW_TIME')).toBe('true');
      expect(state(page, 'TEXT_TO_SPEECH.BREW_START_END')).toBe('true');
      expect(shown(page)).toEqual(
        jasmine.arrayContaining([
          t('TEXT_TO_SPEECH.SPEAK_EVERY_MS'),
          t('TEXT_TO_SPEECH.BREW_TIME_EVERY'),
          '5 s',
          t('TEXT_TO_SPEECH.ANDROID_RATE_HINT'),
          t('TEXT_TO_SPEECH.SCREEN_READER_HINT'),
          t('TEXT_TO_SPEECH.PITCH'),
          t('TEXT_TO_SPEECH.RATE'),
        ]),
      );
    });

    it('keeps whole grams with the weight and the Android hint while anything is said', async () => {
      platforms = ['android'];
      const page = await openSpeech();

      await tap(checkbox(page, t('TEXT_TO_SPEECH.BREW_TIME')));
      expect(shown(page)).not.toContain(t('TEXT_TO_SPEECH.BREW_TIME_EVERY'));
      expect(checkbox(page, t('TEXT_TO_SPEECH.WHOLE_GRAMS'))).toBeDefined();

      await tap(checkbox(page, t('TEXT_TO_SPEECH.WEIGHT')));
      expect(checkbox(page, t('TEXT_TO_SPEECH.WHOLE_GRAMS'))).toBeUndefined();
      expect(shown(page)).not.toContain(t('TEXT_TO_SPEECH.SPEAK_EVERY_MS'));
      expect(shown(page)).toContain(t('TEXT_TO_SPEECH.ANDROID_RATE_HINT'));

      await tap(checkbox(page, t('TEXT_TO_SPEECH.BREW_START_END')));
      expect(shown(page)).not.toContain(t('TEXT_TO_SPEECH.ANDROID_RATE_HINT'));

      await tap(checkbox(page, t('TEXT_TO_SPEECH.BREW_TIME')));
      expect(shown(page)).toContain(t('TEXT_TO_SPEECH.BREW_TIME_EVERY'));
      expect(shown(page)).toContain(t('TEXT_TO_SPEECH.ANDROID_RATE_HINT'));
    });

    it('on iOS shows no hint on the Android rate', async () => {
      platforms = ['ios'];
      const page = await openSpeech();

      expect(checkbox(page, t('TEXT_TO_SPEECH.WHOLE_GRAMS'))).toBeDefined();
      expect(shown(page)).not.toContain(t('TEXT_TO_SPEECH.ANDROID_RATE_HINT'));
    });
  });
});
