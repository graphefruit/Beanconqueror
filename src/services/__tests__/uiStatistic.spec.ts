import { TestBed } from '@angular/core/testing';

import { TranslateService } from '@ngx-translate/core';

import { Mill } from '../../classes/mill/mill';
import { Preparation } from '../../classes/preparation/preparation';
import { Settings } from '../../classes/settings/settings';
import {
  createMockTranslateService,
  createMockUISettingsStorage,
} from '../../test-utils/mock-services';
import { UIBeanStorage } from '../uiBeanStorage';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIGreenBeanStorage } from '../uiGreenBeanStorage';
import { UIHelper } from '../uiHelper';
import { UIMillStorage } from '../uiMillStorage';
import { UIPreparationStorage } from '../uiPreparationStorage';
import { UIRoastingMachineStorage } from '../uiRoastingMachineStorage';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStatistic } from '../uiStatistic';

describe('UIStatistic - archived preparation methods and grinders', () => {
  let service: UIStatistic;
  let settingsStorageSpy: jasmine.SpyObj<UISettingsStorage>;
  let prepStorageSpy: jasmine.SpyObj<UIPreparationStorage>;
  let millStorageSpy: jasmine.SpyObj<UIMillStorage>;
  let settings: Settings;

  let activePrep: Preparation;
  let archivedPrep: Preparation;
  let activeMill: Mill;
  let archivedMill: Mill;

  beforeEach(() => {
    settings = new Settings();
    settingsStorageSpy = createMockUISettingsStorage();
    settingsStorageSpy.getSettings.and.returnValue(settings);

    activePrep = new Preparation();
    activePrep.config.uuid = 'prep-1';
    activePrep.config.unix_timestamp = 1000;
    activePrep.finished = false;

    archivedPrep = new Preparation();
    archivedPrep.config.uuid = 'prep-2';
    archivedPrep.config.unix_timestamp = 1000;
    archivedPrep.finished = true;

    activeMill = new Mill();
    activeMill.config.uuid = 'mill-1';
    activeMill.config.unix_timestamp = 1000;
    activeMill.finished = false;

    archivedMill = new Mill();
    archivedMill.config.uuid = 'mill-2';
    archivedMill.config.unix_timestamp = 1000;
    archivedMill.finished = true;

    prepStorageSpy = jasmine.createSpyObj('UIPreparationStorage', [
      'getAllEntries',
    ]);
    prepStorageSpy.getAllEntries.and.returnValue([activePrep, archivedPrep]);

    millStorageSpy = jasmine.createSpyObj('UIMillStorage', ['getAllEntries']);
    millStorageSpy.getAllEntries.and.returnValue([activeMill, archivedMill]);

    TestBed.configureTestingModule({
      providers: [
        UIStatistic,
        { provide: UISettingsStorage, useValue: settingsStorageSpy },
        { provide: UIPreparationStorage, useValue: prepStorageSpy },
        { provide: UIMillStorage, useValue: millStorageSpy },
        {
          provide: UIBeanStorage,
          useValue: jasmine.createSpyObj('UIBeanStorage', ['getAllEntries']),
        },
        {
          provide: UIBrewStorage,
          useValue: jasmine.createSpyObj('UIBrewStorage', ['getAllEntries']),
        },
        {
          provide: UIGreenBeanStorage,
          useValue: jasmine.createSpyObj('UIGreenBeanStorage', [
            'getAllEntries',
          ]),
        },
        {
          provide: UIRoastingMachineStorage,
          useValue: jasmine.createSpyObj('UIRoastingMachineStorage', [
            'getAllEntries',
          ]),
        },
        {
          provide: UIHelper,
          useValue: jasmine.createSpyObj('UIHelper', [
            'getUnixTimestamp',
            'formateDate',
          ]),
        },
        { provide: TranslateService, useValue: createMockTranslateService() },
      ],
    });

    service = TestBed.inject(UIStatistic);
  });

  describe('getPreparationsCount', () => {
    it('should include archived preparation methods when show_archived_preparations is true', () => {
      settings.statistics.show_archived_preparations = true;
      expect(service.getPreparationsCount()).toBe(2);
    });

    it('should exclude archived preparation methods when show_archived_preparations is false', () => {
      settings.statistics.show_archived_preparations = false;
      expect(service.getPreparationsCount()).toBe(1);
    });
  });

  describe('getMillsCount', () => {
    it('should include archived grinders when show_archived_mills is true', () => {
      settings.statistics.show_archived_mills = true;
      expect(service.getMillsCount()).toBe(2);
    });

    it('should exclude archived grinders when show_archived_mills is false', () => {
      settings.statistics.show_archived_mills = false;
      expect(service.getMillsCount()).toBe(1);
    });
  });
});
