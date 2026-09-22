import { TestBed } from '@angular/core/testing';

import { TranslateService } from '@ngx-translate/core';

import { Bean } from '../../../classes/bean/bean';
import { Brew, BrewInstanceHelper } from '../../../classes/brew/brew';
import { Mill } from '../../../classes/mill/mill';
import { Preparation } from '../../../classes/preparation/preparation';
import { Settings } from '../../../classes/settings/settings';
import type { IHandoffEnvelope } from '../../../interfaces/brew/IHandoff';
import { decodeHandoffPayload } from '../../intentHandler/brew-handoff.decoder';
import { UIAlert } from '../../uiAlert';
import { UIBeanStorage } from '../../uiBeanStorage';
import { UIBrewStorage } from '../../uiBrewStorage';
import { UIFileHelper } from '../../uiFileHelper';
import { UILog } from '../../uiLog';
import { UIMillStorage } from '../../uiMillStorage';
import { UIPreparationStorage } from '../../uiPreparationStorage';
import { UISettingsStorage } from '../../uiSettingsStorage';
import {
  BrewImportRollbackError,
  BrewImportService,
} from '../brew-import.service';

function envelope(overrides: Partial<IHandoffEnvelope> = {}): IHandoffEnvelope {
  return {
    v: 1,
    app: { name: 'Any Sender', version: '1.0' },
    brew: {
      date: '2026-09-20T12:34:56.000Z',
      doseIn: { value: 18, unit: 'g' },
      waterIn: { value: 300, unit: 'ml' },
      beverageOut: { value: 240, unit: 'g' },
      brewTime: 210.25,
      temperature: 93,
      grindSize: '7.2',
      grinderRpm: 60,
      grinderName: 'Any grinder',
      preparationMethod: 'Any brewer',
      bloomTime: 35,
      firstDripTime: 12.5,
      note: 'A completed brew',
    },
    bean: { name: 'Any coffee' },
    flow: {
      fidelity: 'full',
      t: [0, 1000, 250],
      waterDispensed: [0, 125, 25],
      weight: [0, 50, 75],
      temperature: [91, 92, 93],
    },
    metrics: [
      {
        key: 'targetTemperature',
        name: 'Temperature',
        unit: '°C',
        kind: 'target',
        t: [0, 45000],
        v: [93, 91],
      },
      {
        key: 'measuredAgitation',
        name: 'Agitation',
        unit: 'rpm',
        kind: 'measured',
        t: [10000],
        v: [120],
      },
    ],
    imported: {
      source: 'any-sender',
      sourceName: 'Any Sender',
      sourceUrl: 'https://example.com/brews/1',
      device: 'Any brewer',
      schema: 1,
      params: { opaque: ['keep', 123] },
    },
    ...overrides,
  };
}

function entry<T extends Bean | Mill | Preparation>(
  model: T,
  name: string,
  uuid: string,
): T {
  model.name = name;
  model.config.uuid = uuid;
  return model;
}

function cloneBrew(brew: Brew): Brew {
  const cloned = new Brew();
  cloned.initializeByObject(JSON.parse(JSON.stringify(brew)));
  return cloned;
}

async function encodeEnvelopeForDecoder(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value: chunk } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(chunk);
    total += chunk.length;
  }

  const out = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    out.set(chunk, offset);
    offset += chunk.length;
  });

  let binary = '';
  out.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

class MemoryBrewStorage {
  private entries: Brew[] = [];
  public failUpdate = false;
  public failRemove = false;

  public add = jasmine
    .createSpy('add')
    .and.callFake((brew: Brew): Promise<Brew> => {
      const stored = cloneBrew(brew);
      stored.config.uuid = 'saved-brew';
      stored.config.unix_timestamp = 1;
      this.entries.push(stored);
      return Promise.resolve(cloneBrew(stored));
    });

  public update = jasmine
    .createSpy('update')
    .and.callFake((brew: Brew): Promise<boolean> => {
      if (this.failUpdate) {
        return Promise.resolve(false);
      }
      const index = this.entries.findIndex(
        (entry) => entry.config.uuid === brew.config.uuid,
      );
      if (index >= 0) {
        this.entries[index] = cloneBrew(brew);
      }
      return Promise.resolve(index >= 0);
    });

  public removeByObject = jasmine
    .createSpy('removeByObject')
    .and.callFake((brew: Brew): Promise<boolean> => {
      if (this.failRemove) {
        return Promise.resolve(false);
      }
      const index = this.entries.findIndex(
        (entry) => entry.config.uuid === brew.config.uuid,
      );
      if (index >= 0) {
        this.entries.splice(index, 1);
      }
      return Promise.resolve(index >= 0);
    });

  public getEntryByUUID(uuid: string): Brew {
    const stored = this.entries.find((entry) => entry.config.uuid === uuid);
    return stored ? cloneBrew(stored) : null;
  }

  public seed(brew: Brew): void {
    this.entries.push(cloneBrew(brew));
  }
}

describe('BrewImportService', () => {
  let service: BrewImportService;
  let beanStorage: jasmine.SpyObj<UIBeanStorage>;
  let millStorage: jasmine.SpyObj<UIMillStorage>;
  let preparationStorage: jasmine.SpyObj<UIPreparationStorage>;
  let settingsStorage: jasmine.SpyObj<UISettingsStorage>;
  let brewStorage: MemoryBrewStorage;
  let fileHelper: jasmine.SpyObj<UIFileHelper>;
  let uiLog: jasmine.SpyObj<UILog>;
  let uiAlert: jasmine.SpyObj<UIAlert>;
  let settings: Settings;
  let beans: Bean[];
  let mills: Mill[];
  let preparations: Preparation[];

  beforeEach(() => {
    beanStorage = jasmine.createSpyObj('UIBeanStorage', [
      'getAllEntries',
      'getByUUID',
      'add',
    ]);
    millStorage = jasmine.createSpyObj('UIMillStorage', [
      'getAllEntries',
      'add',
    ]);
    preparationStorage = jasmine.createSpyObj('UIPreparationStorage', [
      'getAllEntries',
      'getByUUID',
      'add',
    ]);
    settingsStorage = jasmine.createSpyObj('UISettingsStorage', [
      'getSettings',
    ]);
    brewStorage = new MemoryBrewStorage();
    fileHelper = jasmine.createSpyObj('UIFileHelper', [
      'writeInternalFileFromText',
      'deleteInternalFile',
    ]);
    uiLog = jasmine.createSpyObj('UILog', ['log', 'error']);
    fileHelper.writeInternalFileFromText.and.resolveTo();
    fileHelper.deleteInternalFile.and.resolveTo();

    uiAlert = jasmine.createSpyObj('UIAlert', ['showConfirm']);
    uiAlert.showConfirm.and.resolveTo('NO');

    beans = [entry(new Bean(), 'Any coffee', 'bean-1')];
    mills = [entry(new Mill(), 'Any grinder', 'mill-1')];
    preparations = [entry(new Preparation(), 'Any brewer', 'preparation-1')];

    beanStorage.getAllEntries.and.callFake(() => beans);
    beanStorage.getByUUID.and.callFake((uuid: string) =>
      beans.find((bean) => bean.config.uuid === uuid),
    );
    beanStorage.add.and.callFake((bean: Bean): Promise<Bean> => {
      bean.config.uuid = 'bean-created';
      beans.push(bean);
      return Promise.resolve(bean);
    });
    millStorage.getAllEntries.and.callFake(() => mills);
    preparationStorage.getAllEntries.and.callFake(() => preparations);
    preparationStorage.getByUUID.and.callFake((uuid: string) =>
      preparations.find((preparation) => preparation.config.uuid === uuid),
    );

    settings = new Settings();
    settings.graph_colors.customTrace.active.light = '#123456';
    settings.graph_colors.customTrace.active.dark = '#abcdef';
    settingsStorage.getSettings.and.returnValue(settings);

    (UIBeanStorage as any).instance = beanStorage;
    UIPreparationStorage.instance = preparationStorage;
    BrewInstanceHelper.setEntryAmountBackToZero();

    const translate = jasmine.createSpyObj('TranslateService', ['instant']);
    translate.instant.and.callFake((key: string) => {
      if (key === 'BREW_IMPORT_METRIC_TARGET') {
        return 'Target';
      }
      if (key === 'BREW_IMPORT_METRIC_MEASURED') {
        return 'Measured';
      }
      return key;
    });

    TestBed.configureTestingModule({
      providers: [
        BrewImportService,
        { provide: UIBeanStorage, useValue: beanStorage },
        { provide: UIMillStorage, useValue: millStorage },
        { provide: UIPreparationStorage, useValue: preparationStorage },
        { provide: UIBrewStorage, useValue: brewStorage },
        { provide: UIFileHelper, useValue: fileHelper },
        { provide: UILog, useValue: uiLog },
        { provide: UISettingsStorage, useValue: settingsStorage },
        { provide: UIAlert, useValue: uiAlert },
        { provide: TranslateService, useValue: translate },
      ],
    });

    service = TestBed.inject(BrewImportService);
  });

  afterEach(() => {
    (UIBeanStorage as any).instance = undefined;
    UIPreparationStorage.instance = undefined;
    BrewInstanceHelper.setEntryAmountBackToZero();
  });

  it('maps a full envelope onto brew fields and pins quantity types to host enum keys', () => {
    const result = service.build(envelope());

    expect(result.brew.grind_weight).toBe(18);
    expect(result.brew.brew_quantity).toBe(300);
    expect(result.brew.brew_quantity_type).toBe('ML');
    expect(result.brew.brew_beverage_quantity).toBe(240);
    expect(result.brew.brew_beverage_quantity_type).toBe('GR');
    expect(result.brew.brew_time).toBe(210);
    expect(result.brew.brew_time_milliseconds).toBe(250);
    expect(result.brew.brew_temperature).toBe(93);
    expect(result.brew.grind_size).toBe('7.2');
    expect(result.brew.mill_speed).toBe(60);
    expect(result.brew.coffee_first_drip_time).toBe(12);
    expect(result.brew.coffee_first_drip_time_milliseconds).toBe(500);
    expect(result.brew.coffee_blooming_time).toBe(35);
    expect(result.brew.note).toBe('A completed brew');
    expect(result.brew.config.unix_timestamp).toBe(1789907696);
  });

  it('carries a rating across and leaves an unrated brew at zero', () => {
    expect(
      service.build(envelope({ brew: { ...envelope().brew, rating: 4 } })).brew
        .rating,
    ).toBe(4);
    expect(service.build(envelope()).brew.rating).toBe(0);
  });

  /**
   * Clamped rather than rescaled: stretching a 4 into an 8 because this
   * install counts to ten would put a verdict in the diary that nobody gave.
   */
  it('holds an incoming rating to the scale this user has set', () => {
    settings.brew_rating = 3;

    expect(
      service.build(envelope({ brew: { ...envelope().brew, rating: 5 } })).brew
        .rating,
    ).toBe(3);
  });

  it('splits fractional bloom and first-drip times into seconds and milliseconds', () => {
    const result = service.build(
      envelope({
        brew: {
          ...envelope().brew,
          bloomTime: 35.75,
          firstDripTime: 12.125,
        },
      }),
    );

    expect(result.brew.coffee_blooming_time).toBe(35);
    expect(result.brew.coffee_blooming_time_milliseconds).toBe(750);
    expect(result.brew.coffee_first_drip_time).toBe(12);
    expect(result.brew.coffee_first_drip_time_milliseconds).toBe(125);
  });

  it('carries rounded millisecond overflow into the seconds field', () => {
    const result = service.build(
      envelope({
        brew: {
          ...envelope().brew,
          brewTime: 0.9995,
        },
      }),
    );

    expect(result.brew.brew_time).toBe(1);
    expect(result.brew.brew_time_milliseconds).toBe(0);
  });

  it('reconstructs flow samples from deltas and converts decigrams to grams', () => {
    const result = service.build(envelope());

    expect(result.brewFlow.weight.map((sample) => sample.timestamp)).toEqual([
      '00:00:00.000',
      '00:00:01.000',
      '00:00:01.250',
    ]);
    expect(
      result.brewFlow.weight.map((sample) => sample.actual_weight),
    ).toEqual([0, 5, 12.5]);
    expect(result.brewFlow.weight.map((sample) => sample.old_weight)).toEqual([
      0, 0, 5,
    ]);
    expect(
      result.brewFlow.weight.map((sample) => sample.actual_smoothed_weight),
    ).toEqual([0, 5, 12.5]);
    expect(
      result.brewFlow.weight.map((sample) => sample.not_mutated_weight),
    ).toEqual([0, 5, 12.5]);
    expect(
      result.brewFlow.waterDispensed.map((sample) => sample.actual),
    ).toEqual([0, 12.5, 15]);
    expect(result.brewFlow.waterDispensed.map((sample) => sample.old)).toEqual([
      0, 0, 12.5,
    ]);
    expect(
      result.brewFlow.temperatureFlow.map(
        (sample) => sample.actual_temperature,
      ),
    ).toEqual([91, 92, 93]);
    expect(
      result.brewFlow.temperatureFlow.map((sample) => sample.old_temperature),
    ).toEqual([0, 91, 92]);
  });

  it('rejects flow deltas whose cumulative timestamp exceeds one day', () => {
    expect(() =>
      service.build(
        envelope({
          flow: {
            fidelity: 'full',
            t: [86400000, 1],
            waterDispensed: [0, 100],
            weight: [0, 50],
          },
        }),
      ),
    ).toThrowError(
      'Envelope flow.t cumulative timestamp must be at most 86400000',
    );
  });

  it('rejects flow deltas whose cumulative water total overflows', () => {
    expect(() =>
      service.build(
        envelope({
          flow: {
            fidelity: 'full',
            t: [0, 1000],
            waterDispensed: [Number.MAX_VALUE, Number.MAX_VALUE],
            weight: [0, 0],
          },
        }),
      ),
    ).toThrowError(
      'Envelope flow.waterDispensed cumulative total must be at most 100000',
    );
  });

  it('rejects flow deltas whose cumulative weight total overflows', () => {
    expect(() =>
      service.build(
        envelope({
          flow: {
            fidelity: 'full',
            t: [0, 1000],
            waterDispensed: [0, 0],
            weight: [Number.MAX_VALUE, Number.MAX_VALUE],
          },
        }),
      ),
    ).toThrowError(
      'Envelope flow.weight cumulative total must be at most 100000',
    );
  });

  it('accepts a single flow sample', () => {
    const result = service.build(
      envelope({
        flow: {
          fidelity: 'downsampled',
          t: [125],
          waterDispensed: [34],
          weight: [12],
        },
      }),
    );

    expect(result.brewFlow.weight).toEqual([
      jasmine.objectContaining({
        timestamp: '00:00:00.125',
        actual_weight: 1.2,
        old_weight: 0,
      }),
    ]);
    expect(result.brewFlow.waterDispensed).toEqual([
      jasmine.objectContaining({ actual: 3.4, old: 0 }),
    ]);
  });

  it('accepts an empty flow array without inventing samples', () => {
    const result = service.build(
      envelope({
        flow: {
          fidelity: 'full',
          t: [],
          waterDispensed: [],
          weight: [],
        },
        metrics: undefined,
      }),
    );

    expect(result.brewFlow.weight).toEqual([]);
    expect(result.brewFlow.waterDispensed).toEqual([]);
    expect(result.brewFlow.temperatureFlow).toEqual([]);
    expect(result.brewFlow.customMetrics).toEqual({});
  });

  it('maps metrics to custom metric series and axes with translated prefixes deferred to render time', () => {
    const result = service.build(envelope());

    expect(Object.keys(result.brewFlow.customMetrics)).toContain(
      'targetTemperature',
    );
    expect(result.brewFlow.customMetrics.targetTemperature).toEqual([
      { value: 93, timestamp: '00:00:00.000', brew_time: '0.000' },
      { value: 91, timestamp: '00:00:45.000', brew_time: '45.000' },
    ]);
    expect(
      result.brewFlow.customAxes.find(
        (axis) => axis.key === 'targetTemperature',
      ),
    ).toEqual(
      jasmine.objectContaining({
        key: 'targetTemperature',
        namePrefix: 'BREW_IMPORT_METRIC_TARGET',
        name: 'Temperature',
        unit: '°C',
        colorLight: '#123456',
        colorDark: '#abcdef',
      }),
    );
  });

  it('keeps target and measured metric claims distinguishable in axis metadata', () => {
    const result = service.build(envelope());

    const target = result.brewFlow.customAxes.find(
      (axis) => axis.key === 'targetTemperature',
    );
    const measured = result.brewFlow.customAxes.find(
      (axis) => axis.key === 'measuredAgitation',
    );

    expect(target.namePrefix).toBe('BREW_IMPORT_METRIC_TARGET');
    expect(target.name).toBe('Temperature');
    expect(measured.namePrefix).toBe('BREW_IMPORT_METRIC_MEASURED');
    expect(measured.name).toBe('Agitation');
  });

  it('links a bean whose name matches an existing entry without duplicating it', () => {
    const result = service.build(envelope());

    expect(result.brew.bean).toBe('bean-1');
    expect(beanStorage.add.calls.count()).toBe(0);
  });

  it('creates a pod bean with full metadata before build links the brew by name', async () => {
    beans = [entry(new Bean(), 'Fallback coffee', 'bean-fallback')];
    uiAlert.showConfirm.and.resolveTo('YES');
    const handoff = envelope({
      bean: {
        name: 'Pod coffee',
        origin: 'Ethiopia',
        process: 'Washed',
        variety: 'Heirloom',
        aromatics: 'Jasmine',
        note: 'Bright and floral',
        beanMix: 'Single Origin',
        imageUrl: 'https://example.com/pod.jpg',
      },
    });

    await service.ensureBeanFromHandoff(handoff);
    const result = service.build(handoff);
    const created = beans.find((bean) => bean.config.uuid === 'bean-created');

    expect(uiAlert.showConfirm.calls.allArgs()).toEqual([
      [
        'BREW_IMPORT_CREATE_BEAN_DESCRIPTION',
        'BREW_IMPORT_CREATE_BEAN_TITLE',
        true,
        { name: 'Pod coffee' },
      ],
    ]);
    expect(created.name).toBe('Pod coffee');
    expect(created.note).toBe('Bright and floral');
    expect(created.aromatics).toBe('Jasmine');
    expect(String(created.beanMix)).toBe('SINGLE_ORIGIN');
    expect(created.attachments).toEqual([]);
    expect(created.bean_information).toEqual([
      jasmine.objectContaining({
        country: 'Ethiopia',
        processing: 'Washed',
        variety: 'Heirloom',
      }),
    ]);
    expect(result.brew.bean).toBe('bean-created');
    expect(result.brew.note).toBe('A completed brew');
  });

  it('does not prompt when pod metadata names an existing bean', async () => {
    await service.ensureBeanFromHandoff(
      envelope({
        bean: {
          name: 'Any coffee',
          origin: 'Ethiopia',
          process: 'Washed',
        },
      }),
    );

    expect(uiAlert.showConfirm.calls.count()).toBe(0);
    expect(beanStorage.add.calls.count()).toBe(0);
  });

  it('does not offer to create a coffee the user already has twice over', async () => {
    beans = [
      entry(new Bean(), 'Pod coffee', 'bean-one'),
      entry(new Bean(), 'Pod coffee', 'bean-two'),
    ];
    const handoff = envelope({
      bean: {
        name: 'Pod coffee',
        origin: 'Ethiopia',
        process: 'Natural',
      },
    });

    await service.ensureBeanFromHandoff(handoff);

    expect(uiAlert.showConfirm.calls.count()).toBe(0);
    expect(beanStorage.add.calls.count()).toBe(0);
  });

  it('does not prompt when pod metadata matches an existing bean by widened name', async () => {
    beans = [entry(new Bean(), 'Pod coffee Natural', 'bean-natural')];
    const handoff = envelope({
      bean: {
        name: 'Pod coffee',
        origin: 'Ethiopia',
        process: 'Natural',
      },
    });

    await service.ensureBeanFromHandoff(handoff);
    const result = service.build(handoff);

    expect(uiAlert.showConfirm.calls.count()).toBe(0);
    expect(beanStorage.add.calls.count()).toBe(0);
    expect(result.brew.bean).toBe('bean-natural');
    expect(result.brew.note).toContain(
      'Bean linked to "Pod coffee Natural" from "Pod coffee".',
    );
  });

  it('does not prompt when the bean hint only contains a name', async () => {
    beans = [entry(new Bean(), 'Fallback coffee', 'bean-fallback')];

    await service.ensureBeanFromHandoff(
      envelope({ bean: { name: 'Pod coffee' } }),
    );

    expect(uiAlert.showConfirm.calls.count()).toBe(0);
    expect(beanStorage.add.calls.count()).toBe(0);
  });

  it('keeps the existing fallback note when bean creation is declined', async () => {
    beans = [
      entry(new Bean(), 'Zed coffee', 'bean-z'),
      entry(new Bean(), 'Alpha coffee', 'bean-a'),
    ];
    uiAlert.showConfirm.and.resolveTo('NO');
    const handoff = envelope({
      bean: {
        name: 'Pod coffee',
        origin: 'Ethiopia',
        process: 'Washed',
      },
    });

    await service.ensureBeanFromHandoff(handoff);
    const result = service.build(handoff);

    expect(uiAlert.showConfirm.calls.count()).toBe(1);
    expect(beanStorage.add.calls.count()).toBe(0);
    expect(result.brew.bean).toBe('bean-a');
    expect(result.brew.note).toBe(
      'A completed brew\n\nBean not linked: "Pod coffee" (no match). Using "Alpha coffee".',
    );
  });

  it('includes the bean name in the creation prompt', async () => {
    beans = [entry(new Bean(), 'Fallback coffee', 'bean-fallback')];
    uiAlert.showConfirm.and.resolveTo('NO');

    await service.ensureBeanFromHandoff(
      envelope({
        bean: {
          name: 'Pod coffee',
          origin: 'Ethiopia',
        },
      }),
    );

    expect(uiAlert.showConfirm.calls.allArgs()).toEqual([
      [
        'BREW_IMPORT_CREATE_BEAN_DESCRIPTION',
        'BREW_IMPORT_CREATE_BEAN_TITLE',
        true,
        { name: 'Pod coffee' },
      ],
    ]);
  });

  it('shortens long bean names in the creation prompt', async () => {
    beans = [entry(new Bean(), 'Fallback coffee', 'bean-fallback')];
    uiAlert.showConfirm.and.resolveTo('NO');

    await service.ensureBeanFromHandoff(
      envelope({
        bean: {
          name: 'x'.repeat(512),
          origin: 'Ethiopia',
        },
      }),
    );

    expect(uiAlert.showConfirm.calls.allArgs()).toEqual([
      [
        'BREW_IMPORT_CREATE_BEAN_DESCRIPTION',
        'BREW_IMPORT_CREATE_BEAN_TITLE',
        true,
        { name: `${'x'.repeat(57)}...` },
      ],
    ]);
  });

  it('accepts bean mix enum keys sent verbatim by a handoff sender', async () => {
    const cases = [
      { incoming: 'SINGLE_ORIGIN', expected: 'SINGLE_ORIGIN' },
      { incoming: 'BLEND', expected: 'BLEND' },
      { incoming: 'UNKNOWN', expected: 'UNKNOWN' },
    ];
    uiAlert.showConfirm.and.resolveTo('YES');

    for (const [index, testCase] of cases.entries()) {
      beans = [entry(new Bean(), 'Fallback coffee', 'bean-fallback')];

      await service.ensureBeanFromHandoff(
        envelope({
          bean: {
            name: `Pod coffee ${index}`,
            origin: 'Ethiopia',
            beanMix: testCase.incoming,
          },
        }),
      );

      const created = beans.find((bean) => bean.config.uuid === 'bean-created');
      expect(String(created.beanMix)).toBe(testCase.expected);
    }
  });

  it('accepts bean mix enum keys when the default locale lowercases I differently', async () => {
    const originalToLocaleLowerCase = String.prototype.toLocaleLowerCase;
    const originalToLowerCase = String.prototype.toLowerCase;
    String.prototype.toLocaleLowerCase = function (
      locales?: string | string[],
    ): string {
      if (
        locales === 'en-US' ||
        (Array.isArray(locales) && locales.includes('en-US'))
      ) {
        return originalToLocaleLowerCase.call(this, locales);
      }
      return originalToLocaleLowerCase.call(this, 'tr');
    };
    String.prototype.toLowerCase = function (): string {
      return originalToLocaleLowerCase.call(this, 'tr');
    };

    try {
      beans = [entry(new Bean(), 'Fallback coffee', 'bean-fallback')];
      uiAlert.showConfirm.and.resolveTo('YES');

      await service.ensureBeanFromHandoff(
        envelope({
          bean: {
            name: 'Pod coffee',
            origin: 'Ethiopia',
            beanMix: 'SINGLE_ORIGIN',
          },
        }),
      );

      const created = beans.find((bean) => bean.config.uuid === 'bean-created');
      expect(String(created.beanMix)).toBe('SINGLE_ORIGIN');
    } finally {
      String.prototype.toLocaleLowerCase = originalToLocaleLowerCase;
      String.prototype.toLowerCase = originalToLowerCase;
    }
  });

  it('keeps accepting human bean mix labels and shorthand', async () => {
    const cases = [
      { incoming: 'Single Origin', expected: 'SINGLE_ORIGIN' },
      { incoming: 'single', expected: 'SINGLE_ORIGIN' },
      { incoming: 'Blend', expected: 'BLEND' },
      { incoming: 'Unknown', expected: 'UNKNOWN' },
    ];
    uiAlert.showConfirm.and.resolveTo('YES');

    for (const [index, testCase] of cases.entries()) {
      beans = [entry(new Bean(), 'Fallback coffee', 'bean-fallback')];

      await service.ensureBeanFromHandoff(
        envelope({
          bean: {
            name: `Pod coffee ${index}`,
            origin: 'Ethiopia',
            beanMix: testCase.incoming,
          },
        }),
      );

      const created = beans.find((bean) => bean.config.uuid === 'bean-created');
      expect(String(created.beanMix)).toBe(testCase.expected);
    }
  });

  it('falls back to an unknown bean mix instead of storing unknown handoff wording', async () => {
    beans = [entry(new Bean(), 'Fallback coffee', 'bean-fallback')];
    uiAlert.showConfirm.and.resolveTo('YES');

    await service.ensureBeanFromHandoff(
      envelope({
        bean: {
          name: 'Pod coffee',
          origin: 'Ethiopia',
          beanMix: 'garbage',
        },
      }),
    );

    const created = beans.find((bean) => bean.config.uuid === 'bean-created');
    expect(String(created.beanMix)).toBe('UNKNOWN');
    expect(String(created.beanMix)).not.toBe('garbage');
  });

  it('falls back to the first active bean for a missing bean and does not create one', () => {
    beans = [
      entry(new Bean(), 'Zed coffee', 'bean-z'),
      entry(new Bean(), 'Alpha coffee', 'bean-a'),
    ];

    const result = service.build(
      envelope({ bean: { name: 'Unknown coffee' } }),
    );

    expect(result.brew.bean).toBe('bean-a');
    expect(result.brew.note).toBe(
      'A completed brew\n\nBean not linked: "Unknown coffee" (no match). Using "Alpha coffee".',
    );
    expect(beanStorage.add.calls.count()).toBe(0);
  });

  it('will not link an archived bean, even on an exact name match', () => {
    const beans = [
      entry(new Bean(), 'Ethiopia Guji', 'bean-old'),
      entry(new Bean(), 'Alpha coffee', 'bean-a'),
    ];
    beans[0].finished = true;
    beanStorage.getAllEntries.and.returnValue(beans);
    beanStorage.getByUUID.and.callFake((uuid: string) =>
      beans.find((bean) => bean.config.uuid === uuid),
    );

    const result = service.build(
      envelope({ bean: { name: 'Ethiopia Guji' } }),
    );

    expect(result.brew.bean).toBe('bean-a');
    expect(beanStorage.add.calls.count()).toBe(0);
  });

  it('will not widen onto an archived bean either', () => {
    const beans = [
      entry(new Bean(), 'Ethiopia Guji Natural', 'bean-old'),
      entry(new Bean(), 'Alpha coffee', 'bean-a'),
    ];
    beans[0].finished = true;
    beanStorage.getAllEntries.and.returnValue(beans);
    beanStorage.getByUUID.and.callFake((uuid: string) =>
      beans.find((bean) => bean.config.uuid === uuid),
    );

    const result = service.build(
      envelope({ bean: { name: 'Ethiopia Guji' } }),
    );

    expect(result.brew.bean).toBe('bean-a');
    expect(beanStorage.add.calls.count()).toBe(0);
  });

  it('ignores a non-string bean name from an opaque decoded bean and falls back safely', () => {
    const result = service.build(
      envelope({ bean: { name: 42 } as unknown as IHandoffEnvelope['bean'] }),
    );

    expect(result.brew.bean).toBe('bean-1');
    expect(result.brew.note).toContain(
      'Bean not linked: no name supplied (missing name). Using "Any coffee".',
    );
    expect(beanStorage.add.calls.count()).toBe(0);
  });

  it('normalizes composed and decomposed characters when matching names', () => {
    beans = [entry(new Bean(), 'Café Juno', 'bean-cafe')];

    const result = service.build(
      envelope({ bean: { name: 'Cafe\u0301 Juno' } }),
    );

    expect(result.brew.bean).toBe('bean-cafe');
    expect(result.brew.note).toBe('A completed brew');
  });

  it('leaves a missing mill unset, records the hint in the note, and does not create one', () => {
    mills = [];

    const result = service.build(envelope());

    expect(result.brew.mill).toBe('');
    expect(result.brew.note).toContain('Any grinder');
    expect(result.brew.note).toContain('Grinder not linked');
    expect(millStorage.add.calls.count()).toBe(0);
  });

  it('links a grinder the user named with the model, from a maker-only hint', () => {
    // The sending machine knows its maker and not its model; the user types
    // the model. Neither name is wrong, and before this the two never met.
    millStorage.getAllEntries.and.returnValue([
      entry(new Mill(), 'Any grinder Studio', 'mill-studio'),
    ]);

    const result = service.build(envelope());

    expect(result.brew.mill).toBe('mill-studio');
    expect(result.brew.note).toContain(
      'Grinder linked to "Any grinder Studio" from "Any grinder".',
    );
    expect(millStorage.add.calls.count()).toBe(0);
  });

  it('links a grinder named shorter than the hint', () => {
    // The other direction: once the sender can read its own model, the hint
    // is the longer of the two and the user's entry is the bare maker.
    millStorage.getAllEntries.and.returnValue([
      entry(new Mill(), 'Any', 'mill-short'),
    ]);

    const result = service.build(envelope());

    expect(result.brew.mill).toBe('mill-short');
    expect(result.brew.note).toContain(
      'Grinder linked to "Any" from "Any grinder".',
    );
  });

  it('refuses to guess between two grinders of the same make', () => {
    // A user with both is telling us the distinction matters to them.
    millStorage.getAllEntries.and.returnValue([
      entry(new Mill(), 'Any grinder Studio', 'mill-studio'),
      entry(new Mill(), 'Any grinder Original', 'mill-original'),
    ]);

    const result = service.build(envelope());

    expect(result.brew.mill).toBe('');
    expect(result.brew.note).toContain('Grinder not linked');
  });

  it('does not reach across a word boundary when widening a name', () => {
    // A substring search would take "Ode" to "Odessa". The longer name has to
    // carry on with a separator, not with more of the same word.
    millStorage.getAllEntries.and.returnValue([
      entry(new Mill(), 'Any grinderr', 'mill-other'),
    ]);

    const result = service.build(envelope());

    expect(result.brew.mill).toBe('');
    expect(result.brew.note).toContain('Grinder not linked');
  });

  it('widens a bean name the same way, before falling back', () => {
    const widened = [entry(new Bean(), 'Any coffee Natural', 'bean-natural')];
    beanStorage.getAllEntries.and.returnValue(widened);
    beanStorage.getByUUID.and.callFake((uuid: string) =>
      widened.find((bean) => bean.config.uuid === uuid),
    );

    const result = service.build(envelope({ bean: { name: 'Any coffee' } }));

    expect(result.brew.bean).toBe('bean-natural');
    expect(result.brew.note).toContain(
      'Bean linked to "Any coffee Natural" from "Any coffee".',
    );
  });

  it('falls back instead of guessing when widened bean matching is ambiguous', () => {
    beans = [
      entry(new Bean(), 'Pod coffee Washed', 'bean-washed'),
      entry(new Bean(), 'Pod coffee Natural', 'bean-natural'),
    ];

    const result = service.build(envelope({ bean: { name: 'Pod coffee' } }));

    expect(result.brew.bean).toBe('bean-natural');
    expect(result.brew.note).toContain(
      'Bean not linked: "Pod coffee" (no match). Using "Pod coffee Natural".',
    );
  });

  it('falls back to the first active preparation for a missing preparation and does not create one', () => {
    preparations = [
      entry(new Preparation(), 'V60', 'preparation-v60'),
      entry(new Preparation(), 'Aeropress', 'preparation-aero'),
    ];

    const result = service.build(envelope());

    expect(result.brew.method_of_preparation).toBe('preparation-aero');
    expect(result.brew.note).toContain(
      'Preparation not linked: "Any brewer" (no match). Using "Aeropress".',
    );
    expect(preparationStorage.add.calls.count()).toBe(0);
  });

  it('does not persist an unmatched imported brew with empty bean or preparation UUIDs', () => {
    beans = [entry(new Bean(), 'Fallback bean', 'bean-fallback')];
    preparations = [
      entry(new Preparation(), 'Fallback brewer', 'preparation-fallback'),
    ];

    const result = service.build(
      envelope({
        bean: { name: 'Unknown coffee' },
        brew: { ...envelope().brew, preparationMethod: 'Unknown brewer' },
      }),
    );

    expect(result.brew.bean).toBe('bean-fallback');
    expect(result.brew.method_of_preparation).toBe('preparation-fallback');
  });

  it('loads an unmatched imported brew through host accessors without throwing', () => {
    beans = [entry(new Bean(), 'Fallback bean', 'bean-fallback')];
    preparations = [
      entry(new Preparation(), 'Fallback brewer', 'preparation-fallback'),
    ];

    const brew = service.build(
      envelope({
        bean: { name: 'Unknown coffee' },
        brew: { ...envelope().brew, preparationMethod: 'Unknown brewer' },
      }),
    ).brew;

    expect(() => brew.getBean()).not.toThrow();
    expect(() => brew.getPreparation()).not.toThrow();
    expect(brew.getBean().config.uuid).toBe('bean-fallback');
    expect(brew.getPreparation().config.uuid).toBe('preparation-fallback');
  });

  it('does not guess when a bean name match is ambiguous', () => {
    beans = [
      entry(new Bean(), ' Any Coffee ', 'bean-1'),
      entry(new Bean(), 'any coffee', 'bean-2'),
      entry(new Bean(), 'Fallback coffee', 'bean-fallback'),
    ];

    const result = service.build(envelope());

    expect(result.brew.bean).toBe('bean-1');
    expect(result.brew.note).toContain('Bean not linked');
    expect(result.brew.note).toContain('multiple matches');
    expect(result.brew.note).toContain('Using " Any Coffee "');
  });

  it('imports a complete brew without a flow trace', () => {
    const result = service.build(envelope({ flow: undefined }));

    expect(result.brew.brew_quantity).toBe(300);
    expect(result.brewFlow.customMetrics.targetTemperature.length).toBe(2);
    expect(result.brewFlow.weight).toEqual([]);
  });

  it('does not create empty axes when metrics are absent', () => {
    const result = service.build(envelope({ metrics: undefined }));

    expect(result.brewFlow.customAxes).toEqual([]);
    expect(result.brewFlow.customMetrics).toEqual({});
  });

  it('keeps an empty note empty when no match hints are appended', () => {
    const result = service.build(
      envelope({ brew: { ...envelope().brew, note: '' } }),
    );

    expect(result.brew.note).toBe('');
  });

  it('persists imported provenance, timestamp, and flow path through save and load', async () => {
    const result = await service.import(envelope());

    const loaded = brewStorage.getEntryByUUID(result.brew.config.uuid);

    expect(loaded.config.unix_timestamp).toBe(1789907696);
    expect(loaded.flow_profile).toBe('brews/saved-brew_flow_profile.json');
    expect(loaded.customInformation.imported).toEqual(envelope().imported);
    expect(fileHelper.writeInternalFileFromText.calls.allArgs()).toEqual([
      [jasmine.any(String), 'brews/saved-brew_flow_profile.json'],
    ]);
  });

  it('does not write or assign a flow profile when neither flow nor metrics contain content', async () => {
    const result = await service.import(
      envelope({ flow: undefined, metrics: undefined }),
    );

    const loaded = brewStorage.getEntryByUUID(result.brew.config.uuid);

    expect(result.brew.flow_profile).toBe('');
    expect(loaded.flow_profile).toBe('');
    expect(fileHelper.writeInternalFileFromText.calls.count()).toBe(0);
  });

  it('skips the flow profile and still imports figures when writing flow content fails', async () => {
    fileHelper.writeInternalFileFromText.and.rejectWith(new Error('disk full'));

    const result = await service.import(envelope());

    const loaded = brewStorage.getEntryByUUID(result.brew.config.uuid);
    expect(result.brew.flow_profile).toBe('');
    expect(loaded.flow_profile).toBe('');
    expect(loaded.config.unix_timestamp).toBe(1789907696);
    expect(loaded.customInformation.imported).toEqual(envelope().imported);
  });

  it('rejects with a clean rollback outcome when the post-add update fails and removing the imported brew succeeds', async () => {
    brewStorage.failUpdate = true;

    let rejection: unknown;
    try {
      await service.import(envelope());
      fail('Expected import to reject');
    } catch (ex) {
      rejection = ex;
    }

    expect(rejection).toEqual(jasmine.any(BrewImportRollbackError));
    const error = rejection as BrewImportRollbackError;
    expect(error.message).toBe('Imported brew update failed: saved-brew');
    expect(error.brewUuid).toBe('saved-brew');
    expect(error.beanUuid).toBe('bean-1');
    expect(error.rolledBack).toBeTrue();
    expect(brewStorage.getEntryByUUID('saved-brew')).toBeNull();
    expect(fileHelper.deleteInternalFile).toHaveBeenCalledOnceWith(
      'brews/saved-brew_flow_profile.json',
    );
    expect(brewStorage.removeByObject.calls.count()).toBe(1);
    expect(uiLog.error).toHaveBeenCalledWith(
      'Import brew update failed; rolled back imported brew: saved-brew',
    );
  });

  it('rejects with an unsafe rollback outcome when the post-add update fails and removing the imported brew also fails', async () => {
    brewStorage.failUpdate = true;
    brewStorage.failRemove = true;

    let rejection: unknown;
    try {
      await service.import(envelope());
      fail('Expected import to reject');
    } catch (ex) {
      rejection = ex;
    }

    expect(rejection).toEqual(jasmine.any(BrewImportRollbackError));
    const error = rejection as BrewImportRollbackError;
    expect(error.message).toBe('Imported brew update failed: saved-brew');
    expect(error.brewUuid).toBe('saved-brew');
    expect(error.beanUuid).toBe('bean-1');
    expect(error.rolledBack).toBeFalse();
    expect(brewStorage.getEntryByUUID('saved-brew')).not.toBeNull();
    expect(fileHelper.deleteInternalFile).toHaveBeenCalledOnceWith(
      'brews/saved-brew_flow_profile.json',
    );
    expect(brewStorage.removeByObject.calls.count()).toBe(1);
    expect(uiLog.error).toHaveBeenCalledWith(
      'Import brew update failed; rollback could not remove imported brew: saved-brew',
    );
  });

  it('keeps the original import failure when rollback flow-file deletion fails', async () => {
    brewStorage.failUpdate = true;
    fileHelper.deleteInternalFile.and.rejectWith(new Error('delete failed'));

    await expectAsync(service.import(envelope())).toBeRejectedWithError(
      'Imported brew update failed: saved-brew',
    );
    expect(brewStorage.getEntryByUUID('saved-brew')).toBeNull();
    expect(fileHelper.deleteInternalFile).toHaveBeenCalledOnceWith(
      'brews/saved-brew_flow_profile.json',
    );
    expect(uiLog.error).toHaveBeenCalledWith(
      'Import brew rollback flow-file delete failed: brews/saved-brew_flow_profile.json',
      jasmine.any(Error),
    );
  });

  it('reports the fallback bean uuid in rollback errors when the envelope has no bean', async () => {
    brewStorage.failUpdate = true;

    let rejection: unknown;
    try {
      await service.import(envelope({ bean: undefined }));
      fail('Expected import to reject');
    } catch (ex) {
      rejection = ex;
    }

    expect(rejection).toEqual(jasmine.any(BrewImportRollbackError));
    const error = rejection as BrewImportRollbackError;
    expect(error.message).toBe('Imported brew update failed: saved-brew');
    expect(error.brewUuid).toBe('saved-brew');
    expect(error.beanUuid).toBe('bean-1');
    expect(error.rolledBack).toBeTrue();
  });

  it('rejects without persisting when no bean or preparation fallback exists', async () => {
    beans = [];
    preparations = [];

    await expectAsync(service.import(envelope())).toBeRejectedWithError(
      'Bean not linked: no available Bean.',
    );

    expect(brewStorage.add.calls.count()).toBe(0);
    expect(brewStorage.update.calls.count()).toBe(0);
    expect(fileHelper.writeInternalFileFromText.calls.count()).toBe(0);
  });

  it('loads existing brews without imported provenance from storage', () => {
    const legacy = new Brew();
    legacy.config.uuid = 'legacy-brew';
    legacy.customInformation = { visualizer_id: '' };
    brewStorage.seed(legacy);

    const loaded = brewStorage.getEntryByUUID('legacy-brew');

    expect(loaded.customInformation.imported).toBeUndefined();
  });

  it('handles a decoder-produced null-prototype bean object', async () => {
    const decoded = await decodeHandoffPayload(
      await encodeEnvelopeForDecoder(envelope()),
    );

    expect(decoded.bean).toEqual({ name: 'Any coffee' });

    const result = service.build(decoded);

    expect(result.brew.bean).toBe('bean-1');
  });
});
