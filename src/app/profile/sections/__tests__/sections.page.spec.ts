import { TestBed } from '@angular/core/testing';

import en from '../../../../assets/i18n/en.json';
import { Preparation } from '../../../../classes/preparation/preparation';
import { Settings } from '../../../../classes/settings/settings';
import { UIAlert } from '../../../../services/uiAlert';
import { UILog } from '../../../../services/uiLog';
import { UIPreparationStorage } from '../../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { SectionsPage } from '../sections.page';

describe('SectionsPage', () => {
  let settings: Settings;
  let preparations: Preparation[];
  let saveSettings: jasmine.Spy;
  let updatePreparation: jasmine.Spy;
  let showLoadingSpinner: jasmine.Spy;
  let hideLoadingSpinner: jasmine.Spy;
  let logError: jasmine.Spy;

  beforeEach(() => {
    settings = new Settings();
    preparations = [new Preparation(), new Preparation()];
    // What the settings hold when they are saved, not what they hold later.
    saveSettings = jasmine
      .createSpy('saveSettings')
      .and.callFake((saved: Settings) =>
        Promise.resolve(JSON.parse(JSON.stringify(saved)) as Settings),
      );
    updatePreparation = jasmine.createSpy('update').and.resolveTo();
    showLoadingSpinner = jasmine
      .createSpy('showLoadingSpinner')
      .and.resolveTo();
    hideLoadingSpinner = jasmine
      .createSpy('hideLoadingSpinner')
      .and.resolveTo();
    logError = jasmine.createSpy('error');

    // The template only renders the page's fields; e2e/profile.spec.ts checks
    // the rendered switches in the browser.
    TestBed.overrideTemplate(SectionsPage, '');
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => settings, saveSettings },
        },
        {
          provide: UIPreparationStorage,
          useValue: {
            getAllEntries: () => preparations,
            update: updatePreparation,
          },
        },
        {
          provide: UIAlert,
          useValue: { showLoadingSpinner, hideLoadingSpinner },
        },
        { provide: UILog, useValue: { error: logError } },
      ],
    });
  });

  function open(): SectionsPage {
    const fixture = TestBed.createComponent(SectionsPage);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('offers roasting, water and graphs, but no switch for the grinders', () => {
    expect(open().sections.map((section) => section.field)).toEqual([
      'show_roasting_section',
      'show_water_section',
      'show_graph_section',
    ]);
  });

  it('only uses texts that exist in English', () => {
    const texts: Record<string, unknown> = en;
    for (const section of open().sections) {
      for (const key of [section.title, section.description]) {
        expect(typeof texts[key])
          .withContext(key)
          .toBe('string');
      }
    }
  });

  it('saves a section switched on and off', async () => {
    const page = open();

    await page.toggle('show_roasting_section', true);
    expect(settings.show_roasting_section).toBeTrue();
    expect(saveSettings).toHaveBeenCalledWith(settings);

    saveSettings.calls.reset();
    await page.toggle('show_graph_section', true);
    await page.toggle('show_graph_section', false);
    expect(settings.show_graph_section).toBeFalse();
    expect(saveSettings).toHaveBeenCalledTimes(2);
    expect(updatePreparation).not.toHaveBeenCalled();
  });

  it('records the water in the brew parameters and in every method once water is switched on', async () => {
    settings.manage_parameters.water = false;
    for (const preparation of preparations) {
      preparation.manage_parameters.water = false;
    }

    await open().toggle('show_water_section', true);

    expect(settings.show_water_section).toBeTrue();
    expect(settings.manage_parameters.water).toBeTrue();
    expect(updatePreparation).toHaveBeenCalledTimes(2);
    for (const preparation of preparations) {
      expect(preparation.manage_parameters.water).toBeTrue();
      expect(updatePreparation).toHaveBeenCalledWith(preparation);
    }
    const lastSaved: Settings =
      await saveSettings.calls.mostRecent().returnValue;
    expect(lastSaved.show_water_section).toBeTrue();
    expect(lastSaved.manage_parameters.water).toBeTrue();
    expect(hideLoadingSpinner).toHaveBeenCalled();
  });

  it('leaves the water parameters alone when water is switched off', async () => {
    settings.show_water_section = true;
    settings.manage_parameters.water = true;

    await open().toggle('show_water_section', false);

    expect(settings.show_water_section).toBeFalse();
    expect(settings.manage_parameters.water).toBeTrue();
    expect(updatePreparation).not.toHaveBeenCalled();
    expect(showLoadingSpinner).not.toHaveBeenCalled();
  });

  it('still switches water on and hides the spinner when a method cannot be saved', async () => {
    updatePreparation.and.rejectWith(new Error('storage full'));

    await open().toggle('show_water_section', true);

    expect(logError).toHaveBeenCalled();
    expect(hideLoadingSpinner).toHaveBeenCalled();
    const lastSaved: Settings =
      await saveSettings.calls.mostRecent().returnValue;
    expect(lastSaved.show_water_section).toBeTrue();
  });
});
