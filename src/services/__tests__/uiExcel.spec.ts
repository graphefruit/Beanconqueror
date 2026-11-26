import { TestBed } from '@angular/core/testing';

import { Platform } from '@ionic/angular';

import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import * as XLSX from 'xlsx';

import { Bean } from '../../classes/bean/bean';
import { Brew } from '../../classes/brew/brew';
import { BrewFlow } from '../../classes/brew/brewFlow';
import { GreenBean } from '../../classes/green-bean/green-bean';
import { Mill } from '../../classes/mill/mill';
import { Preparation } from '../../classes/preparation/preparation';
import { Settings } from '../../classes/settings/settings';
import { StorageClass } from '../../classes/storageClass';
import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';
import { ROASTS_ENUM } from '../../enums/beans/roasts';
import { createBean } from '../../test-utils/bean-test-helpers';
import { MemoryDatabase } from '../../test-utils/memory-database';
import {
  createMockTranslateService,
  createMockUILog,
} from '../../test-utils/mock-services';
import { ExcelImportIssue } from '../excel-import-rules';
import { UIAlert } from '../uiAlert';
import { UIBeanHelper } from '../uiBeanHelper';
import { UIBeanStorage } from '../uiBeanStorage';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIExcel } from '../uiExcel';
import { UIFileHelper } from '../uiFileHelper';
import { UIGreenBeanStorage } from '../uiGreenBeanStorage';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UIMillStorage } from '../uiMillStorage';
import { UIPreparationStorage } from '../uiPreparationStorage';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStorage } from '../uiStorage';

type Row = Record<string, unknown>;

/** The texts of the English app for everything the bean sheet is built from. */
const ENGLISH: Record<string, string> = {
  NAV_BEANS: 'Beans',
  BEAN_DATA_NAME: 'Name',
  BEAN_DATA_ROASTER: 'Roaster',
  BEAN_DATA_ROASTING_DATE: 'Roast date',
  BEAN_DATA_ROASTING_TYPE: 'Roast type',
  BEAN_DATA_ROAST_NAME: 'Degree of Roast',
  BEAN_DATA_ROAST_NAME_TYPE: 'Roast type',
  BEAN_DATA_CUSTOM_ROAST_NAME: 'Custom degree of Roast',
  BEAN_DATA_MIX: 'Blend',
  BEAN_DATA_WEIGHT: 'Weight',
  BEAN_DATA_COST: 'Cost',
  BEAN_DATA_AROMATICS: 'Flavour profile',
  BEAN_DATA_CUPPING_POINTS: 'Cupping points',
  BEAN_DATA_DECAFFEINATED: 'Decaffeinated',
  BEAN_DATA_URL: 'Website',
  BEAN_DATA_EAN: 'EAN / Articlenumber',
  NOTES: 'Notes',
  BREW_DATA_RATING: 'Rating',
  ARCHIVED: 'Archived',
  BEAN_DATA_COUNTRY: 'Country',
  BEAN_DATA_REGION: 'Region',
  BEAN_DATA_FARM: 'Farm',
  BEAN_DATA_FARMER: 'Farmer',
  BEAN_DATA_ELEVATION: 'Elevation',
  BEAN_DATA_VARIETY: 'Variety',
  BEAN_DATA_PROCESSING: 'Processing',
  BEAN_DATA_HARVEST_TIME: 'Harvested',
  BEAN_DATA_PERCENTAGE: 'Percentage',
  BEAN_DATA_CERTIFICATION: 'Bean certification',
};

/** An .xlsx file with the given sheets, as the file picker hands it over. */
function xlsxFile(sheets: Record<string, Row[]>): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(rows),
      name,
    );
  }
  return XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  }) as ArrayBuffer;
}

/**
 * Stands in for a bean storage: keeps what addMany() was given the way the
 * database would keep it, as a copy without shared references.
 */
class FakeStorage<T extends object> {
  public entries: T[] = [];
  public readonly stored: T[] = [];
  /**
   * `unsaved`: the save fails, as the storage reports a full disk.
   * `rejects`: the storage itself fails.
   */
  public failure: 'unsaved' | 'rejects' | undefined;
  public readonly addMany = jasmine
    .createSpy('addMany')
    .and.callFake((entries: T[]): Promise<{ saved: boolean; added: T[] }> => {
      if (this.failure === 'rejects') {
        return Promise.reject(new Error('write failed'));
      }
      if (this.failure === 'unsaved') {
        return Promise.resolve({ saved: false, added: [] });
      }
      this.stored.push(...(JSON.parse(JSON.stringify(entries)) as T[]));
      return Promise.resolve({ saved: true, added: entries });
    });

  public getAllEntries(): T[] {
    return this.entries;
  }
}

describe('UIExcel', () => {
  let excel: UIExcel;
  let settings: Settings;
  let beanStorage: FakeStorage<Bean>;
  let greenBeanStorage: FakeStorage<GreenBean>;
  let brewStorage: FakeStorage<Brew>;
  let millStorage: FakeStorage<Mill>;
  let preparationStorage: FakeStorage<Preparation>;
  let saveSettings: jasmine.Spy;
  let showMessage: jasmine.Spy;
  let showMessageWithList: jasmine.Spy;
  let showLoadingSpinner: jasmine.Spy;
  let hideLoadingSpinner: jasmine.Spy;
  let showBeans: jasmine.Spy;
  let generateFrozenId: jasmine.Spy;
  let exportFileToDefaultDirectory: jasmine.Spy;
  let uiLog: ReturnType<typeof createMockUILog>;
  let translateInstant: jasmine.Spy;
  /** The cells the last import did not read. */
  let issues: ExcelImportIssue[];

  function setup(translations: Record<string, string> = {}): void {
    settings = new Settings();
    beanStorage = new FakeStorage<Bean>();
    greenBeanStorage = new FakeStorage<GreenBean>();
    brewStorage = new FakeStorage<Brew>();
    millStorage = new FakeStorage<Mill>();
    preparationStorage = new FakeStorage<Preparation>();
    saveSettings = jasmine.createSpy('saveSettings').and.resolveTo(undefined);
    showMessage = jasmine.createSpy('showMessage').and.resolveTo(undefined);
    showMessageWithList = jasmine
      .createSpy('showMessageWithList')
      .and.resolveTo(undefined);
    showLoadingSpinner = jasmine
      .createSpy('showLoadingSpinner')
      .and.resolveTo(undefined);
    hideLoadingSpinner = jasmine
      .createSpy('hideLoadingSpinner')
      .and.resolveTo(undefined);
    showBeans = jasmine.createSpy('showBeans');
    generateFrozenId = jasmine
      .createSpy('generateFrozenId')
      .and.returnValue('frozen-id');
    exportFileToDefaultDirectory = jasmine
      .createSpy('exportFileToDefaultDirectory')
      .and.resolveTo(undefined);
    uiLog = createMockUILog();
    uiLog.warn = jasmine.createSpy('warn');
    const translate = createMockTranslateService(translations);
    translateInstant = translate.instant;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        UIExcel,
        { provide: UIStorage, useValue: {} },
        { provide: Platform, useValue: {} },
        { provide: UILog, useValue: uiLog },
        {
          provide: UIHelper,
          useValue: {
            // UTC keeps the exported texts the same in every time zone.
            formateDate: (unix: number, format: string) =>
              moment.unix(unix).utc().format(format),
            // Local, as in the app: a roast date is a local day.
            formateDatestr: (date: string, format: string) =>
              moment(date).format(format),
          },
        },
        { provide: UIBrewStorage, useValue: brewStorage },
        { provide: UIBeanStorage, useValue: beanStorage },
        { provide: UIGreenBeanStorage, useValue: greenBeanStorage },
        { provide: UIPreparationStorage, useValue: preparationStorage },
        { provide: UIMillStorage, useValue: millStorage },
        { provide: TranslateService, useValue: translate },
        {
          provide: UIAlert,
          useValue: {
            showMessage,
            showMessageWithList,
            showLoadingSpinner,
            hideLoadingSpinner,
          },
        },
        { provide: UIFileHelper, useValue: { exportFileToDefaultDirectory } },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => settings, saveSettings },
        },
        { provide: UIBeanHelper, useValue: { generateFrozenId, showBeans } },
      ],
    });
    excel = TestBed.inject(UIExcel);
  }

  beforeEach(() => setup());

  /** Imports the rows as the sheet "Beans" and returns the stored beans. */
  async function importBeans(rows: Row[]): Promise<Bean[]> {
    issues = await excel.importBeansByExcel(xlsxFile({ Beans: rows }));
    return beanStorage.stored;
  }

  async function importGreenBeans(rows: Row[]): Promise<GreenBean[]> {
    issues = await excel.importGreenBeansByExcel(
      xlsxFile({ 'Green Beans': rows }),
    );
    return greenBeanStorage.stored;
  }

  const exportFailedMessage = [
    'ERROR_OCCURED',
    'EXCEL_EXPORT',
    undefined,
    true,
  ];

  const importFailedMessage = [
    'BEANS_IMPORTED_UNSUCCESSFULLY_WRONG_EXCELFILE',
    'IMPORT_UNSUCCESSFULLY',
    undefined,
    true,
  ];

  // The technical cause goes to the log only.
  const unreadableFileMessage = [
    'ERROR_OCCURED',
    'IMPORT_UNSUCCESSFULLY',
    undefined,
    true,
  ];

  describe('importing roasted beans', () => {
    it('takes every plain column of a row over into the bean', async () => {
      const [bean] = await importBeans([
        {
          Name: 'Gesha Village',
          Weight: 250,
          Roaster: 'Roastery',
          Website: 'https://example.org',
          Rating: 4,
          'Roast type': 'FILTER',
          'Flavour profile': 'Red, wine, apple',
          Notes: 'Very sweet',
          'EAN / Articlenumber': 4006381333931,
          Cost: 13.5,
          Blend: 'BLEND',
          'Cupping points': 92,
          Decaffeinated: true,
          Archived: true,
          'Degree of Roast': 'CITY_ROAST',
        },
      ]);

      expect(bean.name).toBe('Gesha Village');
      expect(bean.weight).toBe(250);
      expect(bean.roaster).toBe('Roastery');
      expect(bean.url).toBe('https://example.org');
      expect(bean.rating).toBe(4);
      expect(bean.bean_roasting_type).toBe('FILTER');
      expect(bean.aromatics).toBe('Red, wine, apple');
      expect(bean.note).toBe('Very sweet');
      expect(bean.ean_article_number).toBe('4006381333931');
      expect(bean.cost).toBe(13.5);
      expect(bean.beanMix).toBe('BLEND');
      expect(bean.cupping_points).toBe('92');
      expect(bean.decaffeinated).toBeTrue();
      expect(bean.finished).toBeTrue();
      expect(bean.roast).toBe('CITY_ROAST');
      expect(beanStorage.addMany).toHaveBeenCalledTimes(1);
    });

    it('reports the import and shows the imported beans', async () => {
      await importBeans([{ Name: 'One' }, { Name: 'Two' }]);

      expect(showMessage.calls.allArgs()).toEqual([
        [
          'BEANS_IMPORTED_SUCCESSFULLY_DESCRIPTION',
          'IMPORT_SUCCESSFULLY',
          undefined,
          true,
        ],
      ]);
      expect(showBeans).toHaveBeenCalledTimes(1);
      const shown = showBeans.calls.mostRecent().args[0] as Bean[];
      expect(shown.map((bean) => bean.name)).toEqual(['One', 'Two']);
    });

    it('still shows the imported beans when the success message cannot be shown', async () => {
      showMessage.and.rejectWith(new Error('no overlay'));

      await importBeans([{ Name: 'One' }]);

      expect(showBeans).toHaveBeenCalledTimes(1);
    });

    it('skips a row without a name and imports the others', async () => {
      const beans = await importBeans([
        { Name: 'First', Roaster: 'A' },
        { Roaster: 'Nameless' },
        { Name: 'Third', Roaster: 'C' },
      ]);

      expect(beans.map((bean) => bean.name)).toEqual(['First', 'Third']);
      expect(beans.map((bean) => bean.roaster)).toEqual(['A', 'C']);
      expect(issues).toEqual([{ row: 3, field: 'Name' }]);
    });

    it('turns numbers in text columns into text', async () => {
      const [bean] = await importBeans([
        { Name: 123, Roaster: 456, Website: 1, Notes: 3 },
      ]);

      expect(bean.name).toBe('123');
      expect(bean.roaster).toBe('456');
      expect(bean.url).toBe('1');
      expect(bean.note).toBe('3');
    });

    it('keeps the default weight and rating for zero, negative and text values', async () => {
      const beans = await importBeans([
        { Name: 'Zero', Weight: 0, Rating: 0 },
        { Name: 'Negative', Weight: -250, Rating: -3 },
        { Name: 'Text', Weight: 'heavy', Rating: 'great' },
        { Name: 'Number as text', Weight: '250', Rating: '4' },
      ]);

      expect(beans.map((bean) => bean.weight)).toEqual([0, 0, 0, 250]);
      expect(beans.map((bean) => bean.rating)).toEqual([0, 0, 0, 4]);
    });

    it('reads the roast date from the day number Excel stores', async () => {
      const beans = await importBeans([
        { Name: 'Whole day', 'Roast date': 44594 },
        { Name: 'With time', 'Roast date': 44594.5 },
        { Name: 'Date cell', 'Roast date': new Date(2022, 1, 2, 12) },
      ]);

      expect(beans[0].roastingDate).toBe('2022-02-02T00:00:00.000Z');
      expect(beans[1].roastingDate).toBe('2022-02-02T12:00:00.000Z');
      // A date cell holds the same day number, counted in local time.
      expect(beans[2].roastingDate.substring(0, 10)).toBe('2022-02-02');
    });

    it('reads the roast date also from an ISO text and from DD.MM.YYYY', async () => {
      const beans = await importBeans([
        { Name: 'ISO', 'Roast date': '2022-02-02' },
        { Name: 'German', 'Roast date': '02.02.2022' },
      ]);

      // A day typed as text is local midnight, as the app stores a roast date.
      expect(
        beans.map((bean) =>
          moment(bean.roastingDate).format('YYYY-MM-DD HH:mm'),
        ),
      ).toEqual(['2022-02-02 00:00', '2022-02-02 00:00']);
      expect(issues).toEqual([]);
    });

    it('leaves the roast date empty for zero and a missing cell', async () => {
      const beans = await importBeans([
        { Name: 'Zero', 'Roast date': 0 },
        { Name: 'Missing' },
      ]);

      expect(beans.map((bean) => bean.roastingDate)).toEqual(['', '']);
      expect(issues).toEqual([]);
      expect(uiLog.warn).not.toHaveBeenCalled();
    });

    it('leaves a date that is none empty and notes and logs its row and field', async () => {
      const beans = await importBeans([
        { Name: 'Fine', 'Roast date': 44594 },
        {
          Name: 'Typo',
          'Roast date': '31.02.2022',
          'Frozen Date': 'last week',
          'Unfrozen Date': -1,
        },
      ]);

      expect(beans[1].roastingDate).toBe('');
      expect(beans[1].frozenDate).toBe('');
      expect(beans[1].frozenId).toBe('');
      expect(beans[1].unfrozenDate).toBe('');
      // The second bean is in row 3, below the header and the first bean.
      expect(issues).toEqual([
        { row: 3, field: 'Roast date' },
        { row: 3, field: 'Frozen Date' },
        { row: 3, field: 'Unfrozen Date' },
      ]);
      expect(uiLog.warn.calls.allArgs()).toEqual([
        ['Excel import - row 3, Roast date: not read'],
        ['Excel import - row 3, Frozen Date: not read'],
        ['Excel import - row 3, Unfrozen Date: not read'],
      ]);
      // The bean is imported all the same.
      expect(showMessageWithList.calls.mostRecent().args[0]).toBe(
        'BEANS_IMPORTED_SUCCESSFULLY_DESCRIPTION',
      );
    });

    it('names every row and field not taken over in the message, as a list', async () => {
      translateInstant.and.callFake(
        (key: string, params?: { row: number; field: string }) =>
          params ? `${key}: ${params.row}, ${params.field}` : key,
      );

      const beans = await importBeans([
        { Name: 'Fine' },
        { Roaster: 'Nameless' },
        { Name: '   ', Roaster: 'Blank' },
        { Name: 'Typo', 'Roast date': 'soon', Blend: 'Mixed' },
      ]);

      // No bean without a name.
      expect(beans.map((bean) => bean.name)).toEqual(['Fine', 'Typo']);
      expect(showMessage).not.toHaveBeenCalled();
      expect(showMessageWithList.calls.allArgs()).toEqual([
        [
          'BEANS_IMPORTED_SUCCESSFULLY_DESCRIPTION',
          'IMPORT_SUCCESSFULLY',
          'EXCEL_IMPORT_NOT_TAKEN_OVER',
          [
            'EXCEL_IMPORT_ROW_WITHOUT_NAME: 3, Name',
            'EXCEL_IMPORT_ROW_WITHOUT_NAME: 4, Name',
            'EXCEL_IMPORT_FIELD_NOT_READ: 5, Roast date',
            'EXCEL_IMPORT_FIELD_NOT_READ: 5, Blend',
          ],
        ],
      ]);
    });

    it('names the rows when the beans could not be saved', async () => {
      beanStorage.failure = 'rejects';

      await importBeans([{ Name: 'Lost' }, { Roaster: 'Nameless' }]);

      expect(showMessageWithList.calls.allArgs()).toEqual([
        [
          'BEANS_IMPORTED_UNSUCCESSFULLY_NOT_SAVED',
          'IMPORT_UNSUCCESSFULLY',
          'EXCEL_IMPORT_NOT_TAKEN_OVER',
          ['EXCEL_IMPORT_ROW_WITHOUT_NAME'],
        ],
      ]);
    });

    it('stores the key of the blend for its key and its English and German text', async () => {
      const beans = await importBeans([
        { Name: 'Key', Blend: 'BLEND' },
        { Name: 'English', Blend: 'Single Origin' },
        { Name: 'German', Blend: 'Unbekannt' },
        { Name: 'Empty' },
      ]);

      expect(beans.map((bean) => bean.beanMix as string)).toEqual([
        'BLEND',
        'SINGLE_ORIGIN',
        'UNKNOWN',
        'SINGLE_ORIGIN',
      ]);
      expect(issues).toEqual([]);
    });

    it('keeps the default for an unknown blend and notes and logs its row and field', async () => {
      const [bean] = await importBeans([{ Name: 'Mixed', Blend: 'Mixed' }]);

      expect(bean.beanMix as string).toBe('SINGLE_ORIGIN');
      expect(issues).toEqual([{ row: 2, field: 'Blend' }]);
      expect(uiLog.warn).toHaveBeenCalledOnceWith(
        'Excel import - row 2, Blend: not read',
      );
    });

    it('takes the custom degree of roast only for a custom roast', async () => {
      const beans = await importBeans([
        {
          Name: 'Custom',
          'Degree of Roast': 'CUSTOM_ROAST',
          'Custom degree of Roast': 'Nordic',
        },
        { Name: 'Custom without text', 'Degree of Roast': 'CUSTOM_ROAST' },
        {
          Name: 'Not custom',
          'Degree of Roast': 'CITY_ROAST',
          'Custom degree of Roast': 'Ignored',
        },
        { Name: 'No degree', 'Custom degree of Roast': 'Ignored' },
      ]);

      expect(beans.map((bean) => [bean.roast, bean.roast_custom])).toEqual([
        ['CUSTOM_ROAST', 'Nordic'],
        ['CUSTOM_ROAST', ''],
        ['CITY_ROAST', ''],
        ['UNKNOWN', ''],
      ]);
    });

    it('known gap: stores unknown values and text in typed fields unchecked', async () => {
      const [bean] = await importBeans([
        {
          Name: 'Unchecked',
          'Roast type': 'Light filter',
          'Degree of Roast': 3,
          Cost: 'twelve',
          Decaffeinated: 'no',
          Archived: 'false',
        },
      ]);

      expect(bean.bean_roasting_type as string).toBe('Light filter');
      expect(bean.roast as unknown).toBe(3);
      // NaN, which the database stores as null.
      expect(bean.cost).toBeNull();
      // Text in the yes/no fields counts as yes: the bean lands in the archive.
      expect(bean.decaffeinated as unknown).toBe('no');
      expect(bean.finished as unknown).toBe('false');
    });

    describe('variety information', () => {
      it('stores one entry for one variety and switches the variety fields on', async () => {
        const [bean] = await importBeans([
          {
            Name: 'Single',
            '1. Country': 'Ethiopia',
            '1. Region': 'Guji',
            '1. Farm': 'Hambela',
            '1. Farmer': 'Jane',
            '1. Elevation': 2100,
            '1. Variety': 'Heirloom',
            '1. Processing': 'Washed',
            '1. Harvested': 2024,
            '1. Percentage': 100,
            '1. Bean certification': 'Organic',
            '1. Fob Price': 8.5,
            '1. Purchasing Price': 12,
          },
        ]);

        expect(bean.bean_information).toEqual([
          {
            country: 'Ethiopia',
            region: 'Guji',
            farm: 'Hambela',
            farmer: 'Jane',
            elevation: '2100',
            variety: 'Heirloom',
            processing: 'Washed',
            harvest_time: '2024',
            percentage: 100,
            certification: 'Organic',
            fob_price: 8.5,
            purchasing_price: 12,
          },
        ]);
        expect(settings.bean_manage_parameters.bean_information).toBeTrue();
        expect(saveSettings).toHaveBeenCalledOnceWith(settings);
      });

      it('does not save the settings when the variety fields are already on', async () => {
        settings.bean_manage_parameters.bean_information = true;

        await importBeans([{ Name: 'Single', '1. Country': 'Ethiopia' }]);

        expect(saveSettings).not.toHaveBeenCalled();
      });

      it('stores exactly one empty entry and leaves the settings alone without a variety', async () => {
        const [bean] = await importBeans([{ Name: 'Plain' }]);

        expect(bean.bean_information).toEqual([{} as never]);
        expect(settings.bean_manage_parameters.bean_information).toBeFalse();
        expect(saveSettings).not.toHaveBeenCalled();
      });

      it('ignores prices and a percentage that are zero, negative or text', async () => {
        const [bean] = await importBeans([
          {
            Name: 'Prices',
            '1. Country': 'Kenya',
            '1. Fob Price': 0,
            '1. Purchasing Price': -4,
            '1. Percentage': 'half',
          },
        ]);

        expect(bean.bean_information).toEqual([{ country: 'Kenya' } as never]);
      });

      it('does not count a variety that has only a zero price', async () => {
        const [bean] = await importBeans([
          { Name: 'Zero price', '1. Fob Price': 0, '1. Purchasing Price': 0 },
        ]);

        expect(bean.bean_information).toEqual([{} as never]);
        expect(saveSettings).not.toHaveBeenCalled();
      });

      it('counts a variety that has only a percentage or only a purchasing price', async () => {
        const beans = await importBeans([
          { Name: 'Percentage', '1. Percentage': 60 },
          { Name: 'Price', '1. Purchasing Price': 12 },
        ]);

        expect(beans[0].bean_information).toEqual([
          { percentage: 60 } as never,
        ]);
        expect(beans[1].bean_information).toEqual([
          { purchasing_price: 12 } as never,
        ]);
        expect(settings.bean_manage_parameters.bean_information).toBeTrue();
      });

      it('ignores a fifth variety', async () => {
        const [bean] = await importBeans([
          { Name: 'Five', '1. Country': 'Kenya', '5. Country': 'Peru' },
        ]);

        expect(bean.bean_information).toEqual([{ country: 'Kenya' } as never]);
      });

      it('stores every variety of a blend with its own values', async () => {
        const [bean] = await importBeans([
          {
            Name: 'Blend',
            '1. Country': 'Ethiopia',
            '1. Percentage': 60,
            '2. Country': 'Brazil',
            '2. Percentage': 40,
          },
        ]);

        expect(bean.bean_information).toEqual([
          { country: 'Ethiopia', percentage: 60 } as never,
          { country: 'Brazil', percentage: 40 } as never,
        ]);
        expect(bean.bean_information[0]).not.toBe(bean.bean_information[1]);
      });

      it('gives each of four varieties only its own columns', async () => {
        const [bean] = await importBeans([
          {
            Name: 'Blend of four',
            '1. Country': 'Ethiopia',
            '1. Region': 'Guji',
            '2. Country': 'Brazil',
            '2. Farm': 'Fazenda',
            '3. Country': 'Kenya',
            '4. Country': 'Peru',
            '4. Variety': 'Caturra',
          },
        ]);

        expect(bean.bean_information).toEqual([
          { country: 'Ethiopia', region: 'Guji' },
          { country: 'Brazil', farm: 'Fazenda' },
          { country: 'Kenya' },
          { country: 'Peru', variety: 'Caturra' },
        ] as never[]);
      });

      it('stores the first and the third variety when the second is missing', async () => {
        const [bean] = await importBeans([
          {
            Name: 'Gap',
            '1. Country': 'Ethiopia',
            '1. Region': 'Guji',
            '3. Country': 'Kenya',
          },
        ]);

        expect(bean.bean_information).toEqual([
          { country: 'Ethiopia', region: 'Guji' },
          { country: 'Kenya' },
        ] as never[]);
      });

      it('keeps the varieties of different rows apart', async () => {
        const beans = await importBeans([
          { Name: 'A', '1. Country': 'Ethiopia', '1. Region': 'Guji' },
          { Name: 'B', '1. Country': 'Kenya' },
        ]);

        expect(beans.map((bean) => bean.bean_information)).toEqual([
          [{ country: 'Ethiopia', region: 'Guji' }],
          [{ country: 'Kenya' }],
        ] as never[][]);
      });
    });

    describe('frozen beans', () => {
      it('stores the frozen date with a new frozen id and switches freezing on', async () => {
        const [bean] = await importBeans([
          {
            Name: 'Frozen',
            'Frozen Date': 44594,
            'Freezing Storage Type': 'VACUUM',
            'Frozen Note': 'Top drawer',
          },
        ]);

        expect(bean.frozenDate).toBe('2022-02-02T00:00:00.000Z');
        expect(bean.frozenId).toBe('frozen-id');
        expect(bean.unfrozenDate).toBe('');
        expect(bean.frozenStorageType as string).toBe('VACUUM');
        expect(bean.frozenNote).toBe('Top drawer');
        expect(settings.freeze_coffee_beans).toBeTrue();
        expect(saveSettings).toHaveBeenCalledOnceWith(settings);
      });

      it('switches freezing on for a bean that only has an unfrozen date', async () => {
        const [bean] = await importBeans([
          { Name: 'Thawed', 'Unfrozen Date': 44595 },
        ]);

        expect(bean.unfrozenDate).toBe('2022-02-03T00:00:00.000Z');
        expect(bean.frozenDate).toBe('');
        expect(bean.frozenId).toBe('');
        expect(settings.freeze_coffee_beans).toBeTrue();
        expect(saveSettings).toHaveBeenCalledOnceWith(settings);
      });

      it('does not save the settings when freezing is already on', async () => {
        settings.freeze_coffee_beans = true;

        await importBeans([{ Name: 'Frozen', 'Frozen Date': 44594 }]);

        expect(saveSettings).not.toHaveBeenCalled();
      });

      it('leaves freezing off for a storage type and a note without a date', async () => {
        const [bean] = await importBeans([
          {
            Name: 'Not frozen',
            'Frozen Date': 0,
            'Freezing Storage Type': 'VACUUM',
            'Frozen Note': 'Planned',
          },
        ]);

        expect(bean.frozenDate).toBe('');
        expect(bean.frozenId).toBe('');
        expect(bean.frozenStorageType as string).toBe('VACUUM');
        expect(bean.frozenNote).toBe('Planned');
        expect(settings.freeze_coffee_beans).toBeFalse();
        expect(saveSettings).not.toHaveBeenCalled();
      });

      it('saves the settings once per switched setting', async () => {
        await importBeans([
          { Name: 'Frozen', 'Frozen Date': 44594, '1. Country': 'Kenya' },
        ]);

        expect(settings.freeze_coffee_beans).toBeTrue();
        expect(settings.bean_manage_parameters.bean_information).toBeTrue();
        expect(saveSettings).toHaveBeenCalledTimes(2);
      });
    });

    describe('when something fails', () => {
      const notSavedMessage = [
        'BEANS_IMPORTED_UNSUCCESSFULLY_NOT_SAVED',
        'IMPORT_UNSUCCESSFULLY',
        undefined,
        true,
      ];

      it('stores all beans of the file with one call of the storage', async () => {
        const beans = await importBeans([
          { Name: 'First' },
          { Name: 'Second' },
          { Name: 'Third' },
        ]);

        expect(beanStorage.addMany).toHaveBeenCalledTimes(1);
        expect(beans.map((bean) => bean.name)).toEqual([
          'First',
          'Second',
          'Third',
        ]);
      });

      for (const failure of ['unsaved', 'rejects'] as const) {
        it(`reports the storage and not the file when the beans could not be stored (${failure})`, async () => {
          beanStorage.failure = failure;

          const beans = await importBeans([
            { Name: 'First' },
            { Name: 'Second' },
          ]);

          expect(beans).toEqual([]);
          expect(showMessage.calls.allArgs()).toEqual([notSavedMessage]);
          expect(showBeans).not.toHaveBeenCalled();
          expect(uiLog.errors).toEqual(
            failure === 'rejects'
              ? ['Excel import - Beans not stored: write failed']
              : [],
          );
        });
      }

      it('adds no message of its own when the storage has told the user', async () => {
        beanStorage.failure = 'unsaved';
        spyOn(StorageClass, 'getMessagesShown').and.returnValues(3, 4);

        await importBeans([{ Name: 'First' }]);

        expect(showMessage).not.toHaveBeenCalled();
        expect(showBeans).not.toHaveBeenCalled();
      });

      it('leaves the settings alone when the beans that need them could not be stored', async () => {
        beanStorage.failure = 'unsaved';

        await importBeans([
          { Name: 'Plain' },
          { Name: 'Frozen', 'Frozen Date': 44594, '1. Country': 'Kenya' },
        ]);

        expect(settings.freeze_coffee_beans).toBeFalse();
        expect(settings.bean_manage_parameters.bean_information).toBeFalse();
        expect(saveSettings).not.toHaveBeenCalled();
      });

      it('reports a wrong file for a sheet without rows', async () => {
        const beans = await importBeans([]);

        expect(beans).toEqual([]);
        expect(showMessage.calls.allArgs()).toEqual([importFailedMessage]);
        expect(showBeans).not.toHaveBeenCalled();
      });

      it('reports a wrong file when no row has a name, with the rows', async () => {
        const beans = await importBeans([{ Roaster: 'A' }, { Weight: 250 }]);

        expect(beans).toEqual([]);
        expect(showMessage).not.toHaveBeenCalled();
        expect(showMessageWithList.calls.allArgs()).toEqual([
          [
            'BEANS_IMPORTED_UNSUCCESSFULLY_WRONG_EXCELFILE',
            'IMPORT_UNSUCCESSFULLY',
            'EXCEL_IMPORT_NOT_TAKEN_OVER',
            ['EXCEL_IMPORT_ROW_WITHOUT_NAME', 'EXCEL_IMPORT_ROW_WITHOUT_NAME'],
          ],
        ]);
      });

      it('reports a failure instead of crashing when the sheet "Beans" is missing', async () => {
        await expectAsync(
          excel.importBeansByExcel(xlsxFile({ Sheet1: [{ Name: 'Lost' }] })),
        ).toBeResolved();

        expect(beanStorage.addMany).not.toHaveBeenCalled();
        expect(showBeans).not.toHaveBeenCalled();
        expect(showMessage).toHaveBeenCalledTimes(1);
        expect(showMessage.calls.allArgs()).toEqual([importFailedMessage]);
      });

      it('reports a failure and stores nothing for a file that is not a workbook', async () => {
        const brokenZip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4])
          .buffer;

        await expectAsync(excel.importBeansByExcel(brokenZip)).toBeResolved();

        expect(beanStorage.addMany).not.toHaveBeenCalled();
        expect(saveSettings).not.toHaveBeenCalled();
        expect(showBeans).not.toHaveBeenCalled();
        expect(showMessage).toHaveBeenCalledTimes(1);
        expect(showMessage.calls.allArgs()).toEqual([unreadableFileMessage]);
      });

      it('reports a failure and stores nothing without a file', async () => {
        await expectAsync(excel.importBeansByExcel(undefined)).toBeResolved();

        expect(beanStorage.addMany).not.toHaveBeenCalled();
        expect(showMessage).toHaveBeenCalledTimes(1);
      });

      it('stores no bean when a later row cannot be read', async () => {
        generateFrozenId.and.throwError('no id');

        await importBeans([
          { Name: 'Fine' },
          { Name: 'Breaks', 'Frozen Date': 44594 },
        ]);

        expect(beanStorage.addMany).not.toHaveBeenCalled();
        expect(saveSettings).not.toHaveBeenCalled();
        expect(showMessage.calls.allArgs()).toEqual([unreadableFileMessage]);
        expect(uiLog.errors).toEqual(['Excel import - Failed: no id']);
      });

      it('keeps and reports the imported beans when the settings cannot be saved', async () => {
        saveSettings.and.rejectWith(new Error('settings not writable'));

        const beans = await importBeans([
          { Name: 'Frozen', 'Frozen Date': 44594 },
        ]);

        expect(beans.map((bean) => bean.name)).toEqual(['Frozen']);
        expect(showBeans).toHaveBeenCalledTimes(1);
        expect(showMessage.calls.allArgs()).toEqual([
          [
            'BEANS_IMPORTED_SUCCESSFULLY_DESCRIPTION',
            'IMPORT_SUCCESSFULLY',
            undefined,
            true,
          ],
        ]);
        expect(uiLog.errors).toEqual([
          'Excel import - Settings not saved: settings not writable',
        ]);
      });
    });
  });

  describe('importing green beans', () => {
    it('takes every column of a row over into the green bean', async () => {
      const [bean] = await importGreenBeans([
        {
          Name: 'Green Gesha',
          Weight: 1000,
          'Buy Date': 44594,
          Website: 'https://example.org',
          'Flavour profile': 'Floral',
          Notes: 'Bag 3',
          'EAN / Articlenumber': 42,
          Decaffeinated: true,
          'Cupping points': 88.5,
          Cost: 30,
          Archived: true,
          '1. Country': 'Panama',
          '1. Region': 'Boquete',
          '1. Farm': 'Esmeralda',
          '1. Farmer': 'Jane',
          '1. Elevation': 1700,
          '1. Variety': 'Gesha',
          '1. Processing': 'Natural',
          '1. Harvested': 2024,
          '1. Percentage': 100,
          '1. Bean certification': 'Organic',
          '1. Fob Price': 20,
          '1. Purchasing Price': 25,
        },
      ]);

      expect(bean.name).toBe('Green Gesha');
      expect(bean.weight).toBe(1000);
      expect(bean.date).toBe('2022-02-02T00:00:00.000Z');
      expect(bean.url).toBe('https://example.org');
      expect(bean.aromatics).toBe('Floral');
      expect(bean.note).toBe('Bag 3');
      expect(bean.ean_article_number).toBe('42');
      expect(bean.decaffeinated).toBeTrue();
      expect(bean.cupping_points).toBe('88.5');
      expect(bean.cost).toBe(30);
      expect(bean.finished).toBeTrue();
      expect(bean.bean_information).toEqual([
        {
          country: 'Panama',
          region: 'Boquete',
          farm: 'Esmeralda',
          farmer: 'Jane',
          elevation: '1700',
          variety: 'Gesha',
          processing: 'Natural',
          harvest_time: '2024',
          percentage: 100,
          certification: 'Organic',
          fob_price: 20,
          purchasing_price: 25,
        },
      ]);
      expect(settings.bean_manage_parameters.bean_information).toBeTrue();
      expect(saveSettings).toHaveBeenCalledOnceWith(settings);
      expect(showMessage.calls.allArgs()).toEqual([
        [
          'GREEN_BEANS_IMPORTED_SUCCESSFULLY_DESCRIPTION',
          'IMPORT_SUCCESSFULLY',
          undefined,
          true,
        ],
      ]);
      expect(beanStorage.addMany).not.toHaveBeenCalled();
    });

    it('keeps the defaults for a row with only a name', async () => {
      const [bean] = await importGreenBeans([
        { Name: 7, Weight: -1, 'Buy Date': 0 },
      ]);

      expect(bean.name).toBe('7');
      expect(bean.weight).toBe(0);
      expect(bean.date).toBe('');
      expect(bean.bean_information).toEqual([{} as never]);
      expect(saveSettings).not.toHaveBeenCalled();
    });

    it('reads the buy date from a day number, an ISO text and DD.MM.YYYY', async () => {
      const beans = await importGreenBeans([
        { Name: 'Number', 'Buy Date': 44594 },
        { Name: 'ISO', 'Buy Date': '2022-02-02' },
        { Name: 'German', 'Buy Date': '02.02.2022' },
        { Name: 'Not a date', 'Buy Date': 'soon' },
      ]);

      expect(beans[0].date).toBe('2022-02-02T00:00:00.000Z');
      expect(
        beans
          .slice(1, 3)
          .map((bean) => moment(bean.date).format('YYYY-MM-DD HH:mm')),
      ).toEqual(['2022-02-02 00:00', '2022-02-02 00:00']);
      expect(beans[3].date).toBe('');
      expect(issues).toEqual([{ row: 5, field: 'Buy Date' }]);
      expect(uiLog.warn).toHaveBeenCalledOnceWith(
        'Excel import - row 5, Buy Date: not read',
      );
    });

    it('does not import the rating column', async () => {
      const [bean] = await importGreenBeans([{ Name: 'Rated', Rating: 4 }]);

      expect(bean.rating).toBe(0);
    });

    it('skips a row without a name and imports the others', async () => {
      const beans = await importGreenBeans([
        { Name: 'First' },
        { Weight: 500 },
        { Name: 'Third' },
        { Name: ' ', Weight: 250 },
      ]);

      expect(beans.map((bean) => bean.name)).toEqual(['First', 'Third']);
      expect(issues).toEqual([
        { row: 3, field: 'Name' },
        { row: 5, field: 'Name' },
      ]);
    });

    it('counts a variety that has only a percentage or only a purchasing price', async () => {
      const beans = await importGreenBeans([
        { Name: 'Percentage', '1. Percentage': 60 },
        { Name: 'Price', '1. Purchasing Price': 12 },
      ]);

      expect(beans[0].bean_information).toEqual([{ percentage: 60 } as never]);
      expect(beans[1].bean_information).toEqual([
        { purchasing_price: 12 } as never,
      ]);
      expect(settings.bean_manage_parameters.bean_information).toBeTrue();
    });

    it('ignores a negative percentage', async () => {
      const [bean] = await importGreenBeans([
        { Name: 'Negative', '1. Country': 'Kenya', '1. Percentage': -5 },
      ]);

      expect(bean.bean_information).toEqual([{ country: 'Kenya' } as never]);
    });

    it('reads four varieties and ignores a fifth', async () => {
      const [bean] = await importGreenBeans([
        {
          Name: 'Five',
          '1. Country': 'Kenya',
          '2. Country': 'Peru',
          '3. Country': 'Brazil',
          '4. Country': 'Panama',
          '5. Country': 'Ethiopia',
        },
      ]);

      expect(bean.bean_information.map((entry) => entry.country)).toEqual([
        'Kenya',
        'Peru',
        'Brazil',
        'Panama',
      ]);
    });

    it('stores every variety of a blend with its own values', async () => {
      const [bean] = await importGreenBeans([
        {
          Name: 'Green blend',
          '1. Country': 'Ethiopia',
          '1. Percentage': 60,
          '2. Country': 'Brazil',
          '2. Percentage': 40,
        },
      ]);

      expect(bean.bean_information).toEqual([
        { country: 'Ethiopia', percentage: 60 } as never,
        { country: 'Brazil', percentage: 40 } as never,
      ]);
      expect(bean.bean_information[0]).not.toBe(bean.bean_information[1]);
    });

    it('stores the first and the third variety when the second is missing', async () => {
      const [bean] = await importGreenBeans([
        {
          Name: 'Green gap',
          '1. Country': 'Ethiopia',
          '1. Region': 'Guji',
          '3. Country': 'Kenya',
          '3. Farm': 'Karogoto',
        },
      ]);

      expect(bean.bean_information).toEqual([
        { country: 'Ethiopia', region: 'Guji' },
        { country: 'Kenya', farm: 'Karogoto' },
      ] as never[]);
    });

    it('reports the storage and not the file when no green bean could be stored', async () => {
      greenBeanStorage.failure = 'unsaved';

      await importGreenBeans([{ Name: 'Only', '1. Country': 'Kenya' }]);

      expect(showMessage.calls.allArgs()).toEqual([
        [
          'BEANS_IMPORTED_UNSUCCESSFULLY_NOT_SAVED',
          'IMPORT_UNSUCCESSFULLY',
          undefined,
          true,
        ],
      ]);
      expect(settings.bean_manage_parameters.bean_information).toBeFalse();
      expect(saveSettings).not.toHaveBeenCalled();
    });

    it('reports a wrong file for a sheet without a named green bean', async () => {
      await importGreenBeans([{ Weight: 250 }]);

      expect(issues).toEqual([{ row: 2, field: 'Name' }]);
      expect(showMessageWithList.calls.mostRecent().args[0]).toBe(
        importFailedMessage[0],
      );
    });

    it('reports a failure instead of crashing when the sheet "Green Beans" is missing', async () => {
      await expectAsync(
        excel.importGreenBeansByExcel(xlsxFile({ Beans: [{ Name: 'Lost' }] })),
      ).toBeResolved();

      expect(greenBeanStorage.addMany).not.toHaveBeenCalled();
      expect(showMessage).toHaveBeenCalledTimes(1);
      expect(showMessage.calls.allArgs()).toEqual([importFailedMessage]);
    });

    it('reports a file that is not a workbook and leaves the cause to the log', async () => {
      const brokenZip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4])
        .buffer;

      await expectAsync(
        excel.importGreenBeansByExcel(brokenZip),
      ).toBeResolved();

      expect(greenBeanStorage.addMany).not.toHaveBeenCalled();
      expect(showMessage.calls.allArgs()).toEqual([unreadableFileMessage]);
      expect(uiLog.errors.length).toBe(1);
      expect(uiLog.errors[0]).toMatch(/^Excel import - Failed: ./);
    });

    it('keeps and reports the imported green beans when the settings cannot be saved', async () => {
      saveSettings.and.rejectWith(new Error('settings not writable'));

      const beans = await importGreenBeans([
        { Name: 'Green', '1. Country': 'Kenya' },
      ]);

      expect(beans.map((bean) => bean.name)).toEqual(['Green']);
      expect(showMessage.calls.allArgs()).toEqual([
        [
          'GREEN_BEANS_IMPORTED_SUCCESSFULLY_DESCRIPTION',
          'IMPORT_SUCCESSFULLY',
          undefined,
          true,
        ],
      ]);
    });
  });

  describe('exporting everything', () => {
    function bean(): Bean {
      const entry = createBean({
        name: 'Gesha Village',
        roaster: 'Roastery',
        // Local midnight, as the app stores a roast date.
        roastingDate: moment('2022-02-02').format(),
        bean_roasting_type: 'FILTER' as BEAN_ROASTING_TYPE_ENUM,
        roast: 'CUSTOM_ROAST' as ROASTS_ENUM,
        roast_range: 2,
        roast_custom: 'Nordic',
        beanMix: 'BLEND' as BEAN_MIX_ENUM,
        weight: 250,
        cost: 13.5,
        aromatics: 'Red, wine, apple',
        cupping_points: '92',
        decaffeinated: true,
        url: 'https://example.org',
        ean_article_number: '42',
        note: 'Very sweet',
        rating: 4,
        finished: true,
        bean_information: [
          {
            country: 'Ethiopia',
            region: 'Guji',
            farm: 'Hambela',
            farmer: 'Jane',
            elevation: '2100',
            variety: 'Heirloom',
            processing: 'Washed',
            harvest_time: '2024',
            percentage: 60,
            certification: 'Organic',
            purchasing_price: 12,
            fob_price: 8,
          },
          {
            country: 'Brazil',
            region: 'Cerrado',
            farm: 'Fazenda',
            farmer: 'John',
            elevation: '1100',
            variety: 'Bourbon',
            processing: 'Natural',
            harvest_time: '2023',
            percentage: 40,
            certification: 'None',
            purchasing_price: 6,
            fob_price: 4,
          },
        ],
      });
      entry.config.uuid = 'bean-1';
      entry.config.unix_timestamp = 1700000000;
      return entry;
    }

    function mill(): Mill {
      return {
        name: 'Comandante',
        note: 'Red clix',
        finished: false,
        config: { uuid: 'mill-1', unix_timestamp: 1700000000 },
      } as unknown as Mill;
    }

    function preparation(): Preparation {
      return {
        type: 'V60',
        name: 'V60 02',
        style_type: 'POUR_OVER',
        tools: [
          { name: 'Paper', config: { uuid: 'tool-1' } },
          { name: 'Metal', config: { uuid: 'tool-2' } },
        ],
        note: 'Glass',
        finished: true,
        config: { uuid: 'preparation-1', unix_timestamp: 1700000000 },
      } as unknown as Preparation;
    }

    function brew(overrides: Partial<Brew> = {}): Brew {
      return {
        grind_size: '22',
        grind_weight: 15,
        brew_temperature: 94,
        mill_speed: 80,
        mill_timer: 12,
        mill_timer_milliseconds: 5,
        pressure_profile: 'Flat',
        method_of_preparation_tools: ['tool-2'],
        brew_temperature_time: 30,
        brew_temperature_time_milliseconds: 4,
        brew_time: 150,
        brew_time_milliseconds: 250,
        coffee_blooming_time: 40,
        coffee_blooming_time_milliseconds: 3,
        coffee_first_drip_time: 8,
        coffee_first_drip_time_milliseconds: 2,
        brew_quantity: 250,
        coffee_type: 'Filter',
        coffee_concentration: 'Normal',
        rating: 5,
        note: 'Juicy',
        brew_beverage_quantity: 220,
        tds: 1.4,
        water: '',
        config: { uuid: 'brew-1', unix_timestamp: 1700000000 },
        getPreparation: () => preparation(),
        getBean: () => bean(),
        getMill: () => mill(),
        getWater: () => ({ name: 'Soft water' }),
        getExtractionYield: () => '20.53',
        getBrewRatio: () => '1 / 16.67',
        getCalculatedBeanAge: () => 21,
        ...overrides,
      } as unknown as Brew;
    }

    /** The file handed to the device, read back as rows of cells per sheet. */
    async function exportedFile(): Promise<{
      name: string;
      sheetNames: string[];
      rows: (sheet: string) => unknown[][];
      buffer: ArrayBuffer;
    }> {
      const [name, blob] = exportFileToDefaultDirectory.calls.mostRecent()
        .args as [string, Blob];
      const buffer = await blob.arrayBuffer();
      const workbook = XLSX.read(buffer);
      return {
        name,
        sheetNames: workbook.SheetNames,
        rows: (sheet) =>
          XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheet], {
            header: 1,
          }),
        buffer,
      };
    }

    it('writes one sheet each for brews, beans, methods and grinders and shares the file', async () => {
      brewStorage.entries = [brew(), brew()];
      beanStorage.entries = [bean()];
      preparationStorage.entries = [preparation()];
      millStorage.entries = [mill(), mill(), mill()];

      await excel.export();

      expect(exportFileToDefaultDirectory).toHaveBeenCalledOnceWith(
        jasmine.stringMatching(
          /^Beanconqueror_export_\d{2}_\d{2}_\d{4}_\d{2}_\d{2}_\d{2}\.xlsx$/,
        ),
        jasmine.any(Blob),
        true,
      );
      const file = await exportedFile();
      expect(file.sheetNames).toEqual([
        'NAV_BREWS',
        'NAV_BEANS',
        'NAV_PREPARATION',
        'NAV_MILL',
      ]);
      // A header row plus one row per entry.
      expect(file.rows('NAV_BREWS').length).toBe(3);
      expect(file.rows('NAV_BEANS').length).toBe(2);
      expect(file.rows('NAV_PREPARATION').length).toBe(2);
      expect(file.rows('NAV_MILL').length).toBe(4);
      expect(showLoadingSpinner).toHaveBeenCalledTimes(1);
      expect(hideLoadingSpinner).toHaveBeenCalled();
      expect(showMessage).not.toHaveBeenCalled();
    });

    it('writes the grinders with their creation date and id', async () => {
      millStorage.entries = [mill()];

      await excel.export();

      expect((await exportedFile()).rows('NAV_MILL')).toEqual([
        [
          'NAME',
          'NOTES',
          'ARCHIVED',
          'EXCEL.GRINDER.CREATION_DATE',
          'EXCEL.GRINDER.ID',
        ],
        ['Comandante', 'Red clix', false, '14.11.2023 22:13:20', 'mill-1'],
      ]);
    });

    it('writes the methods with the names of their tools', async () => {
      preparationStorage.entries = [preparation()];

      await excel.export();

      expect((await exportedFile()).rows('NAV_PREPARATION')).toEqual([
        [
          'PREPARATION_TYPE',
          'PREPARATION_TYPE_NAME',
          'PREPARATION_TYPE_STYLE',
          'PREPARATION_TOOLS',
          'NOTES',
          'ARCHIVED',
          'EXCEL.PREPARATION.CREATION_DATE',
          'EXCEL.PREPARATION.ID',
        ],
        [
          'V60',
          'V60 02',
          'POUR_OVER',
          'Paper,Metal',
          'Glass',
          true,
          '14.11.2023 22:13:20',
          'preparation-1',
        ],
      ]);
    });

    it('writes a bean with ten columns for each of its varieties', async () => {
      const single = createBean({ name: 'Single' });
      single.bean_information = [
        { country: 'Kenya' } as Bean['bean_information'][number],
      ];
      beanStorage.entries = [bean(), single];

      await excel.export();

      const [header, blend, second] = (await exportedFile()).rows('NAV_BEANS');
      expect(header.length).toBe(40);
      expect(header.slice(0, 20)).toEqual([
        'BEAN_DATA_NAME',
        'BEAN_DATA_ROASTER',
        'BEAN_DATA_ROASTING_DATE',
        'BEAN_DATA_ROASTING_TYPE',
        'BEAN_DATA_ROAST_NAME',
        'BEAN_DATA_ROAST_NAME_TYPE',
        'BEAN_DATA_CUSTOM_ROAST_NAME',
        'BEAN_DATA_MIX',
        'BEAN_DATA_WEIGHT',
        'BEAN_DATA_COST',
        'BEAN_DATA_AROMATICS',
        'BEAN_DATA_CUPPING_POINTS',
        'BEAN_DATA_DECAFFEINATED',
        'BEAN_DATA_URL',
        'BEAN_DATA_EAN',
        'NOTES',
        'BREW_DATA_RATING',
        'EXCEL.BEAN.CREATION_DATE',
        'EXCEL.BEAN.ID',
        'ARCHIVED',
      ]);
      expect(header.slice(20, 30)).toEqual([
        '1. BEAN_DATA_COUNTRY',
        '1. BEAN_DATA_REGION',
        '1. BEAN_DATA_FARM',
        '1. BEAN_DATA_FARMER',
        '1. BEAN_DATA_ELEVATION',
        '1. BEAN_DATA_VARIETY',
        '1. BEAN_DATA_PROCESSING',
        '1. BEAN_DATA_HARVEST_TIME',
        '1. BEAN_DATA_PERCENTAGE',
        '1. BEAN_DATA_CERTIFICATION',
      ]);
      expect(header[30]).toBe('2. BEAN_DATA_COUNTRY');
      expect(blend).toEqual([
        'Gesha Village',
        'Roastery',
        '02.02.2022',
        'Filter',
        2,
        'Custom',
        // Known gap: the name of a custom roast is never exported, because
        // the bean compares its roast key with the display text.
        '-',
        'Blend',
        250,
        13.5,
        'Red, wine, apple',
        '92',
        true,
        'https://example.org',
        '42',
        'Very sweet',
        4,
        '14.11.2023 22:13:20',
        'bean-1',
        true,
        'Ethiopia',
        'Guji',
        'Hambela',
        'Jane',
        '2100',
        'Heirloom',
        'Washed',
        '2024',
        60,
        'Organic',
        'Brazil',
        'Cerrado',
        'Fazenda',
        'John',
        '1100',
        'Bourbon',
        'Natural',
        '2023',
        40,
        'None',
      ]);
      expect(second[0]).toBe('Single');
      expect(second[20]).toBe('Kenya');
      expect(second.length).toBe(21);
    });

    it('does not export the prices of a variety or the frozen information', async () => {
      const frozen = bean();
      frozen.frozenDate = '2022-03-01T00:00:00.000Z';
      frozen.frozenNote = 'Top drawer';
      beanStorage.entries = [frozen];

      await excel.export();

      const [header, row] = (await exportedFile()).rows('NAV_BEANS');
      expect(JSON.stringify(header)).not.toMatch(/PRICE|FROZEN|FREEZ/i);
      expect(row).not.toContain('Top drawer');
      expect(row).not.toContain(12);
      expect(row).not.toContain(8);
    });

    it('writes a brew with the names and ids of its bean, method and grinder', async () => {
      brewStorage.entries = [brew()];

      await excel.export();

      const [header, row] = (await exportedFile()).rows('NAV_BREWS');
      expect(header.length).toBe(29);
      expect(header[0]).toBe('BREW_DATA_GRIND_SIZE');
      expect(header[28]).toBe('EXCEL.GRINDER.ID');
      expect(row).toEqual([
        '22',
        15,
        94,
        'V60 02',
        'Gesha Village',
        'Comandante',
        80,
        '12',
        'Flat',
        'Metal',
        '30',
        '150',
        '40',
        '8',
        250,
        'Filter',
        'Normal',
        5,
        'Juicy',
        220,
        1.4,
        '20.53',
        '14.11.2023 22:13:20',
        '1 / 16.67',
        21,
        true,
        'bean-1',
        'preparation-1',
        'mill-1',
      ]);
    });

    it('appends the milliseconds to the times when the setting is on', async () => {
      settings.brew_milliseconds = true;
      brewStorage.entries = [
        brew(),
        brew({
          brew_time_milliseconds: 0,
          coffee_blooming_time_milliseconds: 0,
          coffee_first_drip_time_milliseconds: 0,
          brew_temperature_time_milliseconds: 0,
          mill_timer_milliseconds: 0,
        }),
      ];

      await excel.export();

      const [, withMilliseconds, without] = (await exportedFile()).rows(
        'NAV_BREWS',
      );
      const times = (row: unknown[]) => [
        row[7],
        row[10],
        row[11],
        row[12],
        row[13],
      ];
      expect(times(withMilliseconds)).toEqual([
        '12.5',
        '30.4',
        '150.250',
        '40.3',
        '8.2',
      ]);
      expect(times(without)).toEqual(['12', '30', '150', '40', '8']);
    });

    it('adds the water column only when the water section is switched on', async () => {
      brewStorage.entries = [brew({ water: 'water-1' }), brew()];

      await excel.export();
      const withoutWater = (await exportedFile()).rows('NAV_BREWS');
      settings.show_water_section = true;
      await excel.export();
      const withWater = (await exportedFile()).rows('NAV_BREWS');

      expect(withoutWater[0]).not.toContain('BREW_DATA_WATER');
      expect(withoutWater[1].length).toBe(29);
      expect(withWater[0][29]).toBe('BREW_DATA_WATER');
      expect(withWater[1][29]).toBe('Soft water');
      // A brew without water gets an empty cell.
      expect(withWater[2][29]).toBe('');
    });

    it('writes only the header rows when nothing is stored', async () => {
      await excel.export();

      const file = await exportedFile();
      expect(file.sheetNames.length).toBe(4);
      for (const sheet of file.sheetNames) {
        expect(file.rows(sheet).length).withContext(sheet).toBe(1);
      }
      // Without a bean there is still one block of variety columns.
      expect(file.rows('NAV_BEANS')[0].length).toBe(30);
      expect(hideLoadingSpinner).toHaveBeenCalled();
    });

    it('logs and reports a file that cannot be written and closes the spinner', async () => {
      exportFileToDefaultDirectory.and.rejectWith(new Error('disk full'));

      await expectAsync(excel.export()).toBeResolved();

      expect(hideLoadingSpinner).toHaveBeenCalledTimes(1);
      expect(showMessage).toHaveBeenCalledOnceWith(...exportFailedMessage);
      expect(uiLog.errors).toEqual(['Excel export - Error occured: disk full']);
    });

    it('reports nothing when the user leaves the share sheet', async () => {
      exportFileToDefaultDirectory.and.rejectWith(new Error('Share canceled'));

      await expectAsync(excel.export()).toBeResolved();

      expect(hideLoadingSpinner).toHaveBeenCalledTimes(1);
      expect(showMessage).not.toHaveBeenCalled();
      expect(uiLog.errors).toEqual([]);
      expect(uiLog.logs).toEqual(['Excel export - Cancelled: Share canceled']);
    });

    it('reports a workbook that cannot be built and closes the spinner', async () => {
      brewStorage.getAllEntries = () => {
        throw new Error('no brews');
      };

      await expectAsync(excel.export()).toBeResolved();

      expect(exportFileToDefaultDirectory).not.toHaveBeenCalled();
      expect(hideLoadingSpinner).toHaveBeenCalledTimes(1);
      expect(showMessage).toHaveBeenCalledOnceWith(...exportFailedMessage);
      expect(uiLog.errors).toEqual(['Excel export - Error occured: no brews']);
    });

    it('cuts a sheet name that is too long for Excel to 31 characters', async () => {
      setup({ NAV_BREWS: 'A sheet name that is far too long for Excel' });

      await excel.export();

      const file = await exportedFile();
      expect(file.sheetNames[0]).toBe('A sheet name that is far too lo');
      expect(showMessage).not.toHaveBeenCalled();
    });

    it('keeps sheet names apart that are the same after cutting or but for the case', async () => {
      setup({
        NAV_BREWS: 'A sheet name that is far too long for brews',
        NAV_BEANS: 'A sheet name that is far too long for beans',
        NAV_PREPARATION: 'a SHEET name that is far too long for methods',
        NAV_MILL: 'Grinders',
      });

      await excel.export();

      expect((await exportedFile()).sheetNames).toEqual([
        'A sheet name that is far too lo',
        'A sheet name that is far to (2)',
        'a SHEET name that is far to (3)',
        'Grinders',
      ]);
    });

    it('lets no numbered sheet name start with an apostrophe', async () => {
      setup({ NAV_BREWS: "'Brews", NAV_BEANS: '_Brews', NAV_MILL: "'brews" });

      await excel.export();

      expect((await exportedFile()).sheetNames).toEqual(
        jasmine.arrayContaining(['_Brews', '_Brews (2)', '_brews (3)']),
      );
    });

    it('replaces the characters Excel forbids in a sheet name', async () => {
      setup({ NAV_BREWS: "'Brews: a/b\\c?d*e[f]'" });

      await excel.export();

      expect((await exportedFile()).sheetNames[0]).toBe(
        '_Brews_ a_b_c_d_e_f__',
      );
    });

    describe('read back by the bean import', () => {
      async function exportAndImport(): Promise<Bean[]> {
        beanStorage.entries = [bean()];
        await excel.export();
        const { buffer } = await exportedFile();
        showMessage.calls.reset();
        await excel.importBeansByExcel(buffer);
        return beanStorage.stored;
      }

      it('known gap: an export in another language than English is refused as a wrong file', async () => {
        setup({ ...ENGLISH, NAV_BEANS: 'Bohnen', BEAN_DATA_NAME: 'Name' });

        const beans = await exportAndImport();

        expect(beans).toEqual([]);
        expect(showMessage).toHaveBeenCalledTimes(1);
        expect(showMessage.calls.mostRecent().args[1]).toBe(
          'IMPORT_UNSUCCESSFULLY',
        );
      });

      it('known gap: a translated header on a sheet named "Beans" imports nothing', async () => {
        setup({ ...ENGLISH, BEAN_DATA_NAME: 'Bezeichnung' });

        const beans = await exportAndImport();

        expect(beans).toEqual([]);
        expect(showMessageWithList.calls.mostRecent().args[0]).toBe(
          importFailedMessage[0],
        );
      });

      it('known gap: an English export comes back with changed and lost values', async () => {
        setup(ENGLISH);

        const [imported] = await exportAndImport();

        // These columns survive.
        expect(imported.name).toBe('Gesha Village');
        expect(imported.roaster).toBe('Roastery');
        expect(imported.weight).toBe(250);
        expect(imported.cost).toBe(13.5);
        expect(imported.aromatics).toBe('Red, wine, apple');
        expect(imported.cupping_points).toBe('92');
        expect(imported.decaffeinated).toBeTrue();
        expect(imported.url).toBe('https://example.org');
        expect(imported.ean_article_number).toBe('42');
        expect(imported.note).toBe('Very sweet');
        expect(imported.rating).toBe(4);
        expect(imported.finished).toBeTrue();
        // The date is exported as text in the date format of the settings
        // and comes back as the same local day.
        expect(moment(imported.roastingDate).format('YYYY-MM-DD')).toBe(
          '2022-02-02',
        );
        // The export writes display texts, the import expects the enum keys.
        expect(imported.bean_roasting_type as string).toBe('Filter');
        // "Degree of Roast" holds the roast range, so the degree is lost.
        expect(imported.roast as unknown).toBe(2);
        expect(imported.roast_custom).toBe('');
        expect(imported.roast_range).toBe(0);
        // Each variety keeps its own values.
        expect(imported.bean_information.map((info) => info.country)).toEqual([
          'Ethiopia',
          'Brazil',
        ]);
        expect(imported.config.uuid).not.toBe('bean-1');
      });

      it('keeps a bean without a roast date without noting it', async () => {
        setup(ENGLISH);
        const exported = bean();
        exported.roastingDate = '';
        beanStorage.entries = [exported];
        await excel.export();
        const { buffer } = await exportedFile();

        issues = await excel.importBeansByExcel(buffer);

        expect(beanStorage.stored.map((entry) => entry.roastingDate)).toEqual([
          '',
        ]);
        expect(issues).toEqual([]);
        expect(uiLog.warn).not.toHaveBeenCalled();
      });

      for (const beanMix of ['SINGLE_ORIGIN', 'BLEND', 'UNKNOWN']) {
        it(`keeps the blend ${beanMix}`, async () => {
          setup(ENGLISH);
          const exported = bean();
          exported.beanMix = beanMix as BEAN_MIX_ENUM;
          beanStorage.entries = [exported];
          await excel.export();
          const { buffer } = await exportedFile();

          issues = await excel.importBeansByExcel(buffer);

          expect(beanStorage.stored.map((entry) => entry.beanMix)).toEqual([
            beanMix as BEAN_MIX_ENUM,
          ]);
          expect(issues).toEqual([]);
        });
      }
    });
  });

  describe('exporting the flow profile of a brew', () => {
    async function exportedSheets(): Promise<Record<string, unknown[][]>> {
      const blob = exportFileToDefaultDirectory.calls.mostRecent()
        .args[1] as Blob;
      const workbook = XLSX.read(await blob.arrayBuffer());
      const sheets: Record<string, unknown[][]> = {};
      for (const name of workbook.SheetNames) {
        sheets[name] = XLSX.utils.sheet_to_json<unknown[]>(
          workbook.Sheets[name],
          { header: 1 },
        );
      }
      return sheets;
    }

    it('does nothing without a flow profile', async () => {
      await excel.exportBrewFlowProfile(undefined);

      expect(showLoadingSpinner).not.toHaveBeenCalled();
      expect(exportFileToDefaultDirectory).not.toHaveBeenCalled();
    });

    it('writes the weight and the flow of a profile without further sensors', async () => {
      const flow = new BrewFlow();
      flow.weight = [
        {
          timestamp: '10:00:00.000',
          brew_time: '0.0',
          actual_weight: 1.5,
          old_weight: 1,
          actual_smoothed_weight: 1.4,
          old_smoothed_weight: 0.9,
        },
      ] as BrewFlow['weight'];
      flow.waterFlow = [
        { timestamp: '10:00:01.000', brew_time: '1.0', value: 2.5 },
      ] as BrewFlow['waterFlow'];
      for (const key of [
        'realtimeFlow',
        'pressureFlow',
        'temperatureFlow',
        'waterDispensed',
        'waterDispensedFlowSecond',
        'customMetrics',
        'brewbyweight',
      ]) {
        delete (flow as unknown as Record<string, unknown>)[key];
      }

      await excel.exportBrewFlowProfile(flow);

      expect(exportFileToDefaultDirectory).toHaveBeenCalledOnceWith(
        jasmine.stringMatching(
          /^Beanconqueror_Flowprofile_Raw_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}_\d{4}\.xlsx$/,
        ),
        jasmine.any(Blob),
        true,
      );
      expect(await exportedSheets()).toEqual({
        'Flow profile raw': [
          [
            'Timestamp',
            'Brew time',
            'Actual weight',
            'Old weight',
            'Actual smoothed weight',
            'Old smoothed weight',
          ],
          ['10:00:00.000', '0.0', 1.5, 1, 1.4, 0.9],
        ],
        'Flow profile calculated': [
          ['Timestamp', 'Time', 'Value'],
          ['10:00:01.000', '1.0', 2.5],
        ],
      });
      expect(hideLoadingSpinner).toHaveBeenCalled();
    });

    it('writes one sheet for each sensor of the profile', async () => {
      const flow = {
        weight: [
          {
            timestamp: '10:00:00.000',
            brew_time: '0.0',
            actual_weight: 1.5,
            old_weight: 1,
            actual_smoothed_weight: 1.4,
            old_smoothed_weight: 0.9,
            not_mutated_weight: 1.6,
          },
        ],
        waterFlow: [],
        realtimeFlow: [
          {
            timestamp: 't1',
            brew_time: '1',
            flow_value: 2,
            smoothed_weight: 3,
            timestampdelta: 4,
          },
        ],
        pressureFlow: [
          {
            timestamp: 't2',
            brew_time: '2',
            actual_pressure: 9,
            old_pressure: 8,
          },
        ],
        temperatureFlow: [
          {
            timestamp: 't3',
            brew_time: '3',
            actual_temperature: 93,
            old_temperature: 92,
          },
        ],
        waterDispensed: [
          { timestamp: 't4', brew_time: '4', actual: 30, old: 20 },
        ],
        waterDispensedFlowSecond: [
          { timestamp: 't5', brew_time: '5', actual: 3, old: 2 },
        ],
        customMetrics: {
          resistance: [{ timestamp: 't6', brew_time: '6', value: 7 }],
          empty: [],
        },
        brewbyweight: [
          {
            target_weight: 36,
            lag_time: 1,
            brew_time: '25',
            timestamp: 't7',
            last_flow_value: 2,
            actual_scale_weight: 34,
            calc_lag_time: 1.1,
            calc_exceeds_weight: true,
            avg_flow_lag_residual_time: 0.5,
            residual_lag_time: 0.4,
            average_flow_rate: 2.1,
            scaleType: 'LUNAR',
          },
        ],
      } as unknown as BrewFlow;

      await excel.exportBrewFlowProfile(flow);

      const sheets = await exportedSheets();
      expect(Object.keys(sheets)).toEqual([
        'Flow profile raw',
        'Flow profile calculated',
        'Flow profile realtime',
        'Flow pressure',
        'Flow temperature',
        'Flow water dispensed',
        'Flow water disp. realtime',
        'Flow metric resistance',
        'Brew by weight',
      ]);
      expect(sheets['Flow profile raw'][0][6]).toBe('Not mutated weight');
      expect(sheets['Flow profile raw'][1][6]).toBe(1.6);
      expect(sheets['Flow profile calculated']).toEqual([
        ['Timestamp', 'Time', 'Value'],
      ]);
      expect(sheets['Flow profile realtime'][1]).toEqual(['t1', '1', 2, 3, 4]);
      expect(sheets['Flow pressure'][1]).toEqual(['t2', '2', 9, 8]);
      expect(sheets['Flow temperature'][1]).toEqual(['t3', '3', 93, 92]);
      expect(sheets['Flow water dispensed'][1]).toEqual(['t4', '4', 30, 20]);
      expect(sheets['Flow water disp. realtime'][1]).toEqual(['t5', '5', 3, 2]);
      expect(sheets['Flow metric resistance'][1]).toEqual(['t6', '6', 7]);
      expect(sheets['Brew by weight'][1]).toEqual([
        36,
        1,
        '25',
        't7',
        2,
        34,
        1.1,
        true,
        0.5,
        0.4,
        2.1,
        'LUNAR',
      ]);
    });

    it('cuts the sheet names of custom metrics with long names and keeps them apart', async () => {
      const flow = {
        weight: [],
        waterFlow: [],
        customMetrics: {
          // "Flow metric " leaves 19 of the 31 characters of a sheet name.
          a_metric_name_of_20_: [{ timestamp: 't', brew_time: '1', value: 1 }],
          a_metric_name_of_20x: [{ timestamp: 't', brew_time: '2', value: 2 }],
        },
      } as unknown as BrewFlow;

      await excel.exportBrewFlowProfile(flow);

      const sheets = await exportedSheets();
      expect(Object.keys(sheets).slice(2)).toEqual([
        'Flow metric a_metric_name_of_20',
        'Flow metric a_metric_name_o (2)',
      ]);
      expect(sheets['Flow metric a_metric_name_o (2)'][1]).toEqual([
        't',
        '2',
        2,
      ]);
      expect(hideLoadingSpinner).toHaveBeenCalledTimes(1);
    });

    it('reports a profile that cannot be turned into sheets and closes the spinner', async () => {
      const flow = { weight: [], waterFlow: undefined } as unknown as BrewFlow;

      await expectAsync(excel.exportBrewFlowProfile(flow)).toBeResolved();

      expect(exportFileToDefaultDirectory).not.toHaveBeenCalled();
      expect(showLoadingSpinner).toHaveBeenCalledTimes(1);
      expect(hideLoadingSpinner).toHaveBeenCalledTimes(1);
      expect(showMessage).toHaveBeenCalledOnceWith(...exportFailedMessage);
    });

    it('logs and reports a file that cannot be written and closes the spinner', async () => {
      exportFileToDefaultDirectory.and.rejectWith(new Error('disk full'));
      const flow = { weight: [], waterFlow: [] } as unknown as BrewFlow;

      await expectAsync(excel.exportBrewFlowProfile(flow)).toBeResolved();

      expect(hideLoadingSpinner).toHaveBeenCalledTimes(1);
      expect(showMessage).toHaveBeenCalledOnceWith(...exportFailedMessage);
      expect(uiLog.errors).toEqual(['Excel export - Error occured: disk full']);
    });
  });

  describe('exporting the brew-by-weight data of several brews', () => {
    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    /** Runs the export through the pause it makes before every brew. */
    async function throughThePauses(running: Promise<void>): Promise<void> {
      let settled = false;
      const done = running.finally(() => (settled = true));
      while (!settled) {
        await Promise.resolve();
        jasmine.clock().tick(50);
      }
      await done;
    }

    async function exportedSheets(): Promise<Record<string, unknown[][]>> {
      const blob = exportFileToDefaultDirectory.calls.mostRecent()
        .args[1] as Blob;
      const workbook = XLSX.read(await blob.arrayBuffer());
      const sheets: Record<string, unknown[][]> = {};
      for (const name of workbook.SheetNames) {
        sheets[name] = XLSX.utils.sheet_to_json<unknown[]>(
          workbook.Sheets[name],
          { header: 1 },
        );
      }
      return sheets;
    }

    function byWeight(target: number, timestamp = '10:00:00.000') {
      return {
        target_weight: target,
        lag_time: 1,
        brew_time: '25',
        timestamp,
        last_flow_value: 2,
        actual_scale_weight: '34,5',
        calc_lag_time: 1.1,
        calc_exceeds_weight: true,
        avg_flow_lag_residual_time: 0.5,
        residual_lag_time: 0.4,
        average_flow_rate: '2,1',
        scaleType: 'LUNAR',
      };
    }

    function entry(
      flow: Record<string, unknown>,
      beverage = 40,
    ): { BREW: Brew; FLOW: BrewFlow } {
      return {
        BREW: {
          grind_weight: 18,
          brew_beverage_quantity: beverage,
        } as unknown as Brew,
        FLOW: flow as unknown as BrewFlow,
      };
    }

    it('writes one sheet per brew with the offset to the target weight', async () => {
      await throughThePauses(
        excel.exportBrewByWeights([
          entry({
            brewbyweight: [byWeight(32), byWeight(50)],
            waterFlow: [{ value: 2 }, { value: 4 }, { value: 0 }],
          }),
          entry({ weight: [] }),
          entry({ brewbyweight: [byWeight(40)], waterFlow: [{ value: 0 }] }),
        ]),
      );

      expect(exportFileToDefaultDirectory).toHaveBeenCalledOnceWith(
        jasmine.stringMatching(/^Beanconqueror_All_Brew_ByWeights_.*\.xlsx$/),
        jasmine.any(Blob),
        true,
      );
      const sheets = await exportedSheets();
      // The brew without brew-by-weight data gets no sheet.
      expect(Object.keys(sheets)).toEqual(['S-0', 'S-1']);
      expect(sheets['S-0'][0].slice(12)).toEqual([
        'grindWeight',
        'brewBeverageQuantity',
        'avgFlow',
        'offsetWeight',
        'offsetWeightPercentage',
      ]);
      // 40 g in the cup for a target of 32 g and of 50 g; the flow averages
      // the values above zero.
      expect(sheets['S-0'][1].slice(12)).toEqual([18, 40, 3, -8, 25]);
      expect(sheets['S-0'][2].slice(12)).toEqual([18, 40, 3, 10, 20]);
      expect(sheets['S-1'][1].slice(12)).toEqual([18, 40, 0, 0, 0]);
      expect(hideLoadingSpinner).toHaveBeenCalled();
    });

    it('known gap: leaves the average flow empty for a brew without flow values', async () => {
      await throughThePauses(
        excel.exportBrewByWeights([
          entry({ brewbyweight: [byWeight(40)] }),
          entry({ brewbyweight: [byWeight(40)], waterFlow: [] }),
        ]),
      );

      const sheets = await exportedSheets();
      // Not 0 as for a flow without a value above zero: the cell is missing.
      expect(sheets['S-0'][1][14]).toBeUndefined();
      expect(sheets['S-1'][1][14]).toBeUndefined();
      expect(sheets['S-0'][1][15]).toBe(0);
    });

    it('writes the short form with the seconds since the first entry', async () => {
      await throughThePauses(
        excel.exportBrewByWeightsSmall([
          entry({
            brewbyweight: [
              byWeight(36, '10:00:00.000'),
              byWeight(36, '10:00:01.500'),
            ],
          }),
          entry({ brewbyweight: [] }),
          entry({ brewbyweight: [{ target_weight: 36 }] }),
          entry({ weight: [] }),
        ]),
      );

      const sheets = await exportedSheets();
      // Brews without usable brew-by-weight entries get no sheet.
      expect(sheets).toEqual({
        'S-0': [
          [
            'timestamp',
            'actual_scale_weight',
            'average_flow_rate',
            'calc_exceeds_weight',
          ],
          ['00.000', '34.5', '2.1', true],
          ['01.500', '34.5', '2.1', true],
        ],
      });
      expect(hideLoadingSpinner).toHaveBeenCalled();
    });

    it('reports and logs an export without any brew, as Excel needs a sheet', async () => {
      await throughThePauses(excel.exportBrewByWeights([]));

      expect(exportFileToDefaultDirectory).not.toHaveBeenCalled();
      expect(showMessage).toHaveBeenCalledOnceWith(...exportFailedMessage);
      expect(uiLog.errors).toEqual([
        'Excel export - Error occured: Workbook is empty',
      ]);
      expect(hideLoadingSpinner).toHaveBeenCalledTimes(1);
    });
  });
});

describe('UIExcel importing beans into the real storage', () => {
  let database: MemoryDatabase;
  let excel: UIExcel;
  let beans: UIBeanStorage;
  let showMessage: jasmine.Spy;
  let showBeans: jasmine.Spy;

  const rows = Array.from({ length: 40 }, (_, i) => ({ Name: `Bean ${i}` }));

  beforeEach(async () => {
    database = new MemoryDatabase();
    showMessage = jasmine.createSpy('showMessage').and.resolveTo(undefined);
    showBeans = jasmine.createSpy('showBeans');
    const alert = { showMessage };
    const providers = database.providers();
    // The import and the storage show their messages in the same place.
    (UIAlert.getInstance as jasmine.Spy).and.returnValue(alert);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ...providers,
        UIExcel,
        { provide: UIAlert, useValue: alert },
        { provide: UIBeanHelper, useValue: { showBeans } },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => new Settings() },
        },
        ...[
          Platform,
          UIHelper,
          UIBrewStorage,
          UIGreenBeanStorage,
          UIPreparationStorage,
          UIMillStorage,
          UIFileHelper,
        ].map((service) => ({ provide: service, useValue: {} })),
      ],
    });
    database.values.set('BEANS', [
      { config: { uuid: 'there' }, name: 'There' },
    ]);
    beans = TestBed.inject(UIBeanStorage);
    await beans.initializeStorage();
    excel = TestBed.inject(UIExcel);
  });

  it('writes the beans once for 40 imported beans', async () => {
    await excel.importBeansByExcel(xlsxFile({ Beans: rows }));

    expect(database.writes('BEANS')).toBe(1);
    expect(database.uuids('BEANS').length).toBe(41);
    expect(new Set(database.uuids('BEANS')).size).toBe(41);
    expect(showMessage.calls.allArgs()).toEqual([
      [
        'BEANS_IMPORTED_SUCCESSFULLY_DESCRIPTION',
        'IMPORT_SUCCESSFULLY',
        undefined,
        true,
      ],
    ]);
    expect(showBeans.calls.mostRecent().args[0].length).toBe(40);
  });

  it('leaves no bean in the storage and shows one message when they could not be written', async () => {
    database.failingWrites.add('BEANS');

    await excel.importBeansByExcel(xlsxFile({ Beans: rows }));

    expect(showMessage).toHaveBeenCalledTimes(1);
    expect(showBeans).not.toHaveBeenCalled();
    expect(database.uuids('BEANS')).toEqual(['there']);
    expect(beans.getRawEntries().length).toBe(1);

    // The next write of the beans stores none of them either.
    database.failingWrites.clear();
    await beans.update(beans.getAllEntries()[0]);
    expect(database.uuids('BEANS')).toEqual(['there']);
  });
});
