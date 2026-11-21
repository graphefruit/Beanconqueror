import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { Bean } from '../../../../classes/bean/bean';
import { Settings } from '../../../../classes/settings/settings';
import { StorageClass } from '../../../../classes/storageClass';
import { UIAlert } from '../../../../services/uiAlert';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../../services/uiBeanStorage';
import { UIFileHelper } from '../../../../services/uiFileHelper';
import { UIHelper } from '../../../../services/uiHelper';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { UIToast } from '../../../../services/uiToast';
import { MemoryDatabase } from '../../../../test-utils/memory-database';
import { BeanPopoverUnfreezeComponent } from '../bean-popover-unfreeze.component';

const ORIGINAL_UUID = 'frozen-bean';
const UUID_PATTERN = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
// Late in the evening in UTC and already the next day in Berlin.
const NOW = '2026-03-01T23:30:00.000Z';
const FROZEN_DATE = '2026-01-10T08:00:00.000Z';
// A 1x1 PNG, the smallest picture the browser can decode.
const DECODABLE_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const UNDECODABLE = 'AAAA';
const SAVE_FAILED_MESSAGE = ['STORAGE_SAVE_FAILED', undefined, undefined, true];

describe('BeanPopoverUnfreezeComponent', () => {
  let database: MemoryDatabase;
  let beans: UIBeanStorage;
  let component: BeanPopoverUnfreezeComponent;
  let settings: Settings;

  let dismiss: jasmine.Spy;
  let showInfoToast: jasmine.Spy;
  let showLoadingSpinner: jasmine.Spy;
  let hideLoadingSpinner: jasmine.Spy;
  let showMessage: jasmine.Spy;
  let saveSettings: jasmine.Spy;
  let trackEvent: jasmine.Spy;
  let generatePath: jasmine.Spy;
  let writePhoto: jasmine.Spy;
  let readPhoto: jasmine.Spy;
  let writtenFiles: Map<string, string>;

  /** The bean as the database holds it before the dialog opens. */
  function frozenBean(_changes: Partial<Bean> = {}): Bean {
    const bean = new Bean();
    bean.config.uuid = ORIGINAL_UUID;
    bean.config.unix_timestamp = 1700000000;
    bean.name = 'Alpha';
    bean.roaster = 'Roastery';
    bean.weight = 250;
    bean.cost = 20;
    bean.frozenDate = FROZEN_DATE;
    bean.frozenId = 'OLD';
    return Object.assign(bean, _changes);
  }

  /** Stores the bean and opens the dialog for it. */
  async function open(_changes: Partial<Bean> = {}): Promise<void> {
    database.values.set(
      'BEANS',
      JSON.parse(JSON.stringify([frozenBean(_changes)])),
    );
    beans = TestBed.inject(UIBeanStorage);
    await beans.initializeStorage();
    database.set.calls.reset();
    component = TestBed.runInInjectionContext(
      () => new BeanPopoverUnfreezeComponent(),
    );
    component.bean = beans.getEntryByUUID(ORIGINAL_UUID);
    component.ngOnInit();
  }

  function stored(): Bean[] {
    return (database.values.get('BEANS') ?? []) as Bean[];
  }

  function storedOriginal(): Bean {
    return stored().find((_bean) => _bean.config.uuid === ORIGINAL_UUID);
  }

  function storedParts(): Bean[] {
    return stored().filter((_bean) => _bean.config.uuid !== ORIGINAL_UUID);
  }

  /** What the app shows until its next start. */
  function inMemory(): Bean[] {
    return beans.getRawEntries() as Bean[];
  }

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(NOW));

    database = new MemoryDatabase();
    // The collections tell only once per start that they were not read.
    (
      StorageClass as unknown as { refusedWriteReported: boolean }
    ).refusedWriteReported = false;

    dismiss = jasmine.createSpy('dismiss').and.resolveTo(true);
    showInfoToast = jasmine.createSpy('showInfoToast');
    showLoadingSpinner = jasmine
      .createSpy('showLoadingSpinner')
      .and.resolveTo();
    hideLoadingSpinner = jasmine
      .createSpy('hideLoadingSpinner')
      .and.resolveTo();
    showMessage = jasmine.createSpy('showMessage').and.resolveTo();
    saveSettings = jasmine.createSpy('saveSettings').and.resolveTo();
    trackEvent = jasmine.createSpy('trackEvent');
    settings = new Settings();

    writtenFiles = new Map();
    let files = 0;
    generatePath = jasmine
      .createSpy('generateInternalPath')
      .and.callFake((_prefix: string, _ending: string) =>
        Promise.resolve(`${_prefix}-${++files}${_ending}`),
      );
    writePhoto = jasmine
      .createSpy('writeInternalFileFromBase64')
      .and.callFake((_base64: string, _path: string) => {
        writtenFiles.set(_path, _base64);
        return Promise.resolve({ path: _path, fullpath: `/data/${_path}` });
      });
    readPhoto = jasmine
      .createSpy('readInternalFileAsBase64')
      .and.resolveTo(UNDECODABLE);

    let frozenIds = 0;
    const alert = { showLoadingSpinner, hideLoadingSpinner, showMessage };
    const providers = database.providers();
    // The dialog and the collection show their messages in the same place.
    (UIAlert.getInstance as jasmine.Spy).and.returnValue(alert);
    TestBed.configureTestingModule({
      providers: [
        ...providers,
        { provide: UIAlert, useValue: alert },
        { provide: ModalController, useValue: { dismiss } },
        { provide: UIToast, useValue: { showInfoToast } },
        { provide: UIAnalytics, useValue: { trackEvent } },
        {
          provide: UIFileHelper,
          useValue: {
            generateInternalPath: generatePath,
            writeInternalFileFromBase64: writePhoto,
            readInternalFileAsBase64: readPhoto,
            deleteInternalFile: (_path: string) => {
              writtenFiles.delete(_path);
              return Promise.resolve();
            },
          },
        },
        {
          provide: UIBeanHelper,
          useValue: { generateFrozenId: () => `F${++frozenIds}` },
        },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => settings, saveSettings },
        },
        {
          // Rounding and copying are part of what is characterized here.
          provide: UIHelper,
          useValue: {
            toFixedIfNecessary: (_value: unknown, _digits: number) =>
              UIHelper.prototype.toFixedIfNecessary(_value, _digits),
            cloneData: (_value: unknown) => StorageClass.cloneData(_value),
          },
        },
      ],
    });
    // Not rendered: what is stored does not go through the template.
    TestBed.overrideTemplate(BeanPopoverUnfreezeComponent, '');
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  describe('opening', () => {
    it('offers the whole weight of the bag', async () => {
      await open({ weight: 123.4 });

      expect(component.maxWeight).toBe(123.4);
      expect(component.unfreezeWeight).toBe(123.4);
      expect(component.copyAttachments).toBeFalse();
      expect(component.quality).toBe(100);
      expect(component.maxMB).toBe(0.5);
    });

    it('closes itself by its id without a result', async () => {
      await open();

      await component.dismiss();

      expect(dismiss.calls.allArgs()).toEqual([
        [undefined, undefined, 'bean-popover-unfreeze'],
      ]);
      expect(database.set).not.toHaveBeenCalled();
      expect(trackEvent).not.toHaveBeenCalled();
    });

    it('shows the pins of the sliders as plain numbers', async () => {
      await open();

      expect(component.pinFormatter(33.3)).toBe('33.3');
      expect(component.pinFormatterMB(0.1 + 0.2)).toBe('0.3');
      expect(component.pinFormatterMB('1.256')).toBe('1.26');
      expect(component.pinFormatterMB(4)).toBe('4');
      expect(component.pinFormatterMB('abc')).toBe('0');
      expect(component.pinFormatterMB(undefined)).toBe('0');
    });
  });

  describe('a weight that cannot be unfrozen', () => {
    for (const weight of [0, -1, 250.1, 1e9, null]) {
      it(`stores nothing and stays open for ${weight} g of 250 g`, async () => {
        await open();
        component.unfreezeWeight = weight;

        await component.save();

        expect(database.set).not.toHaveBeenCalled();
        expect(storedOriginal().unfrozenDate).toBe('');
        expect(showInfoToast).not.toHaveBeenCalled();
        expect(saveSettings).not.toHaveBeenCalled();
        expect(showLoadingSpinner).not.toHaveBeenCalled();
        expect(dismiss).not.toHaveBeenCalled();
        expect(trackEvent).not.toHaveBeenCalled();
      });
    }

    it('known gap: a weight that is not a number empties the frozen bag and stores a part of 0 g', async () => {
      await open();
      component.unfreezeWeight = NaN;

      await component.save();

      expect(storedOriginal().weight).toBe(0);
      expect(storedOriginal().cost).toBe(20);
      expect(storedParts().map((_bean) => _bean.weight)).toEqual([0]);
      expect(showInfoToast.calls.allArgs()).toEqual([
        ['TOAST_BEAN_PARTIALLY_UNFROZEN_SUCCESSFULLY'],
      ]);
    });
  });

  describe('unfreezing the whole bag', () => {
    it('stores the moment of unfreezing and nothing else', async () => {
      await open({ attachments: ['photo.jpg'] });
      const before = structuredClone(storedOriginal());

      await component.save();

      expect(storedOriginal().unfrozenDate).toBe(NOW);
      expect({ ...storedOriginal(), unfrozenDate: '', config: null }).toEqual({
        ...before,
        config: null,
      });
      expect(storedOriginal().weight).toBe(250);
      expect(storedOriginal().cost).toBe(20);
      expect(storedOriginal().frozenDate).toBe(FROZEN_DATE);
      expect(storedOriginal().frozenId).toBe('OLD');
      expect(storedOriginal().frozenGroupId).toBe('');
      expect(stored().length).toBe(1);
      expect(database.written()).toEqual(['BEANS']);
    });

    it('counts as a change of this device', async () => {
      await open();

      await component.save();

      expect(storedOriginal().config.updated_by).toBe('device-a');
      expect(storedOriginal().config.updated_at).toBe(Date.parse(NOW));
      expect(storedOriginal().config.unix_timestamp).toBe(1700000000);
    });

    it('tells that it worked, shows all beans again and closes', async () => {
      settings.bean_filter.OPEN.favourite = true;
      await open();

      await component.save();

      expect(showInfoToast.calls.allArgs()).toEqual([
        ['TOAST_BEAN_UNFROZEN_SUCCESSFULLY'],
      ]);
      expect(settings.bean_filter.OPEN.favourite).toBeFalse();
      expect(saveSettings.calls.allArgs()).toEqual([[settings]]);
      expect(dismiss.calls.allArgs()).toEqual([
        [undefined, undefined, 'bean-popover-unfreeze'],
      ]);
      // Only splitting a bag takes long enough for a spinner.
      expect(showLoadingSpinner).not.toHaveBeenCalled();
      expect(hideLoadingSpinner).not.toHaveBeenCalled();
      expect(readPhoto).not.toHaveBeenCalled();
    });

    it('reports the unfreezing to the analytics without naming the bean', async () => {
      await open();

      await component.save();

      expect(trackEvent.calls.allArgs()).toEqual([['BEAN', 'UNFREEZE']]);
    });

    it('copies no photos, even when that was chosen before the weight went back up', async () => {
      await open({ attachments: ['photo.jpg'] });
      component.copyAttachments = true;

      await component.save();

      expect(readPhoto).not.toHaveBeenCalled();
      expect(writtenFiles.size).toBe(0);
      expect(storedOriginal().attachments).toEqual(['photo.jpg']);
    });

    it('stays open with one message when the bag could not be saved', async () => {
      await open();
      database.failingWrites.add('BEANS');

      await component.save();

      expect(storedOriginal().unfrozenDate).toBe('');
      expect(showMessage.calls.allArgs()).toEqual([SAVE_FAILED_MESSAGE]);
      expect(showInfoToast).not.toHaveBeenCalled();
      expect(saveSettings).not.toHaveBeenCalled();
      expect(dismiss).not.toHaveBeenCalled();
      expect(trackEvent).not.toHaveBeenCalled();
      // The collection took the failed write back, the dialog kept its bean.
      expect(inMemory()[0].unfrozenDate).toBe('');
      expect(component.bean.unfrozenDate).toBe('');
    });
  });

  describe('unfreezing a part of the bag', () => {
    it('stores the part as a new bean and takes its weight off the frozen bag', async () => {
      await open();
      component.unfreezeWeight = 100;

      await component.save();

      expect(stored().length).toBe(2);
      expect(storedParts()[0].weight).toBe(100);
      expect(storedOriginal().weight).toBe(150);
      expect(storedParts()[0].unfrozenDate).toBe(NOW);
      expect(storedOriginal().unfrozenDate).toBe('');
      expect(stored().map((_bean) => _bean.config.uuid)).toEqual([
        ORIGINAL_UUID,
        storedParts()[0].config.uuid,
      ]);
    });

    it('makes the part an entry of its own that keeps the freezing data', async () => {
      await open({ frozenNote: 'Top drawer', note: 'Fruity' });
      // The bag was changed twice by another device.
      Object.assign(component.bean.config, {
        created_at: 5,
        updated_at: 6,
        rev: 3,
        updated_by: 'device-b',
        future: 'kept',
      });
      component.unfreezeWeight = 100;

      await component.save();

      const part = storedParts()[0];
      expect(part.config.uuid).toMatch(UUID_PATTERN);
      // Nothing of the change info of the frozen bag is kept.
      expect(part.config).toEqual({
        uuid: part.config.uuid,
        unix_timestamp: Date.parse(NOW) / 1000,
        created_at: Date.parse(NOW),
        updated_at: Date.parse(NOW),
        rev: 1,
        updated_by: 'device-a',
      });
      expect(part.frozenId).toBe('F1');
      expect(part.frozenDate).toBe(FROZEN_DATE);
      expect(part.frozenNote).toBe('Top drawer');
      expect(part.name).toBe('Alpha');
      expect(part.roaster).toBe('Roastery');
      expect(part.note).toBe('Fruity');
      expect(storedOriginal().frozenId).toBe('OLD');
      expect(storedOriginal().config.unix_timestamp).toBe(1700000000);
    });

    it('puts the bag and its part into a new group', async () => {
      await open();
      component.unfreezeWeight = 100;

      await component.save();

      expect(storedOriginal().frozenGroupId).toMatch(UUID_PATTERN);
      expect(storedParts()[0].frozenGroupId).toBe(
        storedOriginal().frozenGroupId,
      );
      // The group, the part and the remaining weight are one write.
      expect(database.written()).toEqual(['BEANS']);
    });

    it('keeps the group of a bag that was split before', async () => {
      await open({ frozenGroupId: 'group-1' });
      component.unfreezeWeight = 100;

      await component.save();

      expect(storedOriginal().frozenGroupId).toBe('group-1');
      expect(storedParts()[0].frozenGroupId).toBe('group-1');
      expect(database.written()).toEqual(['BEANS']);
    });

    it('splits the cost by weight', async () => {
      await open();
      component.unfreezeWeight = 100;

      await component.save();

      expect(storedParts()[0].cost).toBe(8);
      expect(storedOriginal().cost).toBe(12);
    });

    it('rounds the shares of the cost to two digits without losing a cent', async () => {
      await open({ cost: 10, weight: 300 });
      component.unfreezeWeight = 100;

      await component.save();

      expect(storedParts()[0].cost).toBe(3.33);
      expect(storedOriginal().cost).toBe(6.67);
    });

    it('rounds the remaining cost of a bag whose cost has more than two digits', async () => {
      await open({ cost: 10.999, weight: 100 });
      component.unfreezeWeight = 50;

      await component.save();

      expect(storedParts()[0].cost).toBe(5.5);
      expect(storedOriginal().cost).toBe(5.5);
    });

    it('keeps a bag without cost free of cost', async () => {
      await open({ cost: 0 });
      component.unfreezeWeight = 100;

      await component.save();

      expect(storedParts()[0].cost).toBe(0);
      expect(storedOriginal().cost).toBe(0);
    });

    it('rounds both weights to one digit', async () => {
      await open({ weight: 100, cost: 20 });
      component.unfreezeWeight = 33.33;

      await component.save();

      expect(storedParts()[0].weight).toBe(33.3);
      expect(storedOriginal().weight).toBe(66.7);
      // The cost follows the rounded weight of the part.
      expect(storedParts()[0].cost).toBe(6.66);
      expect(storedOriginal().cost).toBe(13.34);
    });

    it('takes the smallest step of the slider off a bag', async () => {
      await open();
      component.unfreezeWeight = 0.1;

      await component.save();

      expect(storedParts()[0].weight).toBe(0.1);
      expect(storedOriginal().weight).toBe(249.9);
      expect(storedParts()[0].cost).toBe(0.01);
      expect(storedOriginal().cost).toBe(19.99);
    });

    it('leaves the smallest step of the slider in a very large bag', async () => {
      await open({ weight: 100000, cost: 1500 });
      component.unfreezeWeight = 99999.9;

      await component.save();

      expect(storedParts()[0].weight).toBe(99999.9);
      expect(storedOriginal().weight).toBe(0.1);
      expect(storedParts()[0].cost).toBe(1500);
      expect(storedOriginal().cost).toBe(0);
    });

    it('known gap: stores a part of 0 g for a weight below the rounding', async () => {
      await open();
      component.unfreezeWeight = 0.04;

      await component.save();

      expect(storedParts().map((_bean) => _bean.weight)).toEqual([0]);
      expect(storedOriginal().weight).toBe(250);
    });

    it('known gap: the part keeps the share code and the QR code of the frozen bag', async () => {
      await open({
        internal_share_code: 'share-code',
        qr_code: 'qr',
        shared: true,
      });
      component.unfreezeWeight = 100;

      await component.save();

      // Freezing a part clears all three on the new bean.
      expect(storedParts()[0].internal_share_code).toBe('share-code');
      expect(storedParts()[0].qr_code).toBe('qr');
      expect(storedParts()[0].shared).toBeTrue();
      expect(storedOriginal().internal_share_code).toBe('share-code');
    });

    it('shows a spinner while it works, then tells, shows all beans again and closes', async () => {
      settings.bean_filter.OPEN.favourite = true;
      await open();
      component.unfreezeWeight = 100;
      const steps: string[] = [];
      const step = (_name: string) => {
        steps.push(_name);
        return Promise.resolve(true);
      };
      showLoadingSpinner.and.callFake(() => step('spinner'));
      hideLoadingSpinner.and.callFake(() => step('hidden'));
      database.set.and.callFake((_key: string, _value: unknown) => {
        steps.push('write');
        database.values.set(_key, structuredClone(_value));
        return Promise.resolve(true);
      });
      showInfoToast.and.callFake((_text: string) => void steps.push(_text));
      saveSettings.and.callFake(() => step('settings'));
      dismiss.and.callFake(() => step('closed'));

      await component.save();

      expect(steps).toEqual([
        'spinner',
        'write',
        'hidden',
        'TOAST_BEAN_PARTIALLY_UNFROZEN_SUCCESSFULLY',
        'settings',
        'closed',
      ]);
      expect(settings.bean_filter.OPEN.favourite).toBeFalse();
      expect(saveSettings.calls.allArgs()).toEqual([[settings]]);
    });

    it('reports the unfreezing to the analytics without naming the bean', async () => {
      await open();
      component.unfreezeWeight = 100;

      await component.save();

      expect(trackEvent.calls.allArgs()).toEqual([['BEAN', 'UNFREEZE']]);
    });

    describe('when the bag has photos', () => {
      it('gives the part none unless chosen and leaves those of the bag alone', async () => {
        await open({ attachments: ['a.jpg', 'b.png'] });
        component.unfreezeWeight = 100;

        await component.save();

        expect(storedParts()[0].attachments).toEqual([]);
        expect(storedOriginal().attachments).toEqual(['a.jpg', 'b.png']);
        expect(readPhoto).not.toHaveBeenCalled();
        expect(writtenFiles.size).toBe(0);
      });

      it('gives the part its own copy of every photo as a JPEG', async () => {
        readPhoto.and.resolveTo(DECODABLE_PNG);
        await open({ attachments: ['a.png', 'b.png'] });
        component.unfreezeWeight = 100;
        component.copyAttachments = true;

        await component.save();

        expect(readPhoto.calls.allArgs()).toEqual([['a.png'], ['b.png']]);
        expect(storedParts()[0].attachments).toEqual([
          'photo-1.jpg',
          'photo-2.jpg',
        ]);
        expect([...writtenFiles.keys()]).toEqual([
          'photo-1.jpg',
          'photo-2.jpg',
        ]);
        expect(writtenFiles.get('photo-1.jpg')).toMatch(
          /^data:image\/jpeg;base64,.{100,}/,
        );
        expect(storedOriginal().attachments).toEqual(['a.png', 'b.png']);
      });

      it('scales a copy to as many pixels as the chosen megabytes have bytes', async () => {
        readPhoto.and.resolveTo(DECODABLE_PNG);
        await open({ attachments: ['a.png'] });
        component.unfreezeWeight = 100;
        component.copyAttachments = true;
        component.maxMB = 0.25;
        const sizes: number[][] = [];
        const toDataURL = spyOn(
          HTMLCanvasElement.prototype,
          'toDataURL',
        ).and.callFake(function (this: HTMLCanvasElement) {
          sizes.push([this.width, this.height]);
          return 'data:image/jpeg;base64,SCALED';
        });

        await component.save();

        // The 1x1 picture is enlarged: 512 * 512 = 0.25 * 1024 * 1024.
        expect(sizes).toEqual([[512, 512]]);
        expect(toDataURL.calls.argsFor(0)[0]).toBe('image/jpeg');
        expect(writtenFiles.get('photo-1.jpg')).toBe(
          'data:image/jpeg;base64,SCALED',
        );
      });

      for (const [quality, handedOver] of [
        [100, 10],
        [20, 2],
      ]) {
        it(`known gap: a quality of ${quality} % reaches the browser as ${handedOver}, outside the 0 to 1 it knows`, async () => {
          readPhoto.and.resolveTo(DECODABLE_PNG);
          await open({ attachments: ['a.png'] });
          component.unfreezeWeight = 100;
          component.copyAttachments = true;
          component.quality = quality;
          const toDataURL = spyOn(
            HTMLCanvasElement.prototype,
            'toDataURL',
          ).and.callThrough();

          await component.save();

          expect(toDataURL.calls.allArgs()).toEqual([
            ['image/jpeg', handedOver],
          ]);
        });
      }

      it('copies a photo the browser cannot decode as it is, by the ending of its file', async () => {
        await open({ attachments: ['a.png', 'b.jpg'] });
        component.unfreezeWeight = 100;
        component.copyAttachments = true;

        await component.save();

        expect([...writtenFiles.entries()]).toEqual([
          ['photo-1.png', 'data:image/png;base64,AAAA'],
          ['photo-2.jpg', 'data:image/jpeg;base64,AAAA'],
        ]);
        expect(storedParts()[0].attachments).toEqual([
          'photo-1.png',
          'photo-2.jpg',
        ]);
      });

      it('skips a photo that cannot be read, without a word, and copies the others', async () => {
        readPhoto.and.callFake((_path: string) =>
          _path === 'gone.jpg'
            ? Promise.reject(new Error('File does not exist'))
            : Promise.resolve(UNDECODABLE),
        );
        await open({ attachments: ['gone.jpg', '', 'b.jpg'] });
        component.unfreezeWeight = 100;
        component.copyAttachments = true;

        await component.save();

        expect(readPhoto.calls.allArgs()).toEqual([['gone.jpg'], ['b.jpg']]);
        expect(storedParts()[0].attachments).toEqual(['photo-1.jpg']);
        expect(storedParts()[0].weight).toBe(100);
        expect(showMessage).not.toHaveBeenCalled();
        expect(showInfoToast.calls.allArgs()).toEqual([
          ['TOAST_BEAN_PARTIALLY_UNFROZEN_SUCCESSFULLY'],
        ]);
      });

      it('copies nothing for a bag without photos', async () => {
        await open({ attachments: [] });
        component.unfreezeWeight = 100;
        component.copyAttachments = true;

        await component.save();

        expect(readPhoto).not.toHaveBeenCalled();
        expect(storedParts()[0].attachments).toEqual([]);
      });

      it('stores nothing, deletes the copies and stays open with one message when a copy cannot be written', async () => {
        writePhoto.and.callFake((_base64: string, _path: string) => {
          if (_path === 'photo-2.jpg') {
            return Promise.reject(new Error('disk full'));
          }
          writtenFiles.set(_path, _base64);
          return Promise.resolve({ path: _path, fullpath: `/data/${_path}` });
        });
        await open({ attachments: ['a.jpg', 'b.jpg'] });
        component.unfreezeWeight = 100;
        component.copyAttachments = true;

        await component.save();

        expect(database.set).not.toHaveBeenCalled();
        expect(stored().length).toBe(1);
        expect(storedOriginal().weight).toBe(250);
        expect(storedOriginal().frozenGroupId).toBe('');
        expect(showLoadingSpinner).toHaveBeenCalledTimes(1);
        expect(hideLoadingSpinner).toHaveBeenCalledTimes(1);
        expect(showMessage.calls.allArgs()).toEqual([SAVE_FAILED_MESSAGE]);
        expect(showInfoToast).not.toHaveBeenCalled();
        expect(dismiss).not.toHaveBeenCalled();
        // The first copy was written and is deleted again.
        expect(writePhoto.calls.argsFor(0)).toEqual([
          'data:image/jpeg;base64,AAAA',
          'photo-1.jpg',
        ]);
        expect([...writtenFiles.keys()]).toEqual([]);
      });
    });

    describe('when the beans cannot be saved', () => {
      it('keeps the dialog open and the bag as it was when the part cannot be stored', async () => {
        await open({ attachments: ['a.jpg'] });
        component.unfreezeWeight = 100;
        component.copyAttachments = true;
        database.failingWrites.add('BEANS');

        await component.save();

        expect(stored().length).toBe(1);
        expect(storedOriginal().weight).toBe(250);
        expect(storedOriginal().frozenGroupId).toBe('');
        expect(showMessage.calls.allArgs()).toEqual([SAVE_FAILED_MESSAGE]);
        expect(showInfoToast).not.toHaveBeenCalled();
        expect(dismiss).not.toHaveBeenCalled();
        expect(trackEvent).not.toHaveBeenCalled();
        // The photo copied for the part is deleted again.
        expect([...writtenFiles.keys()]).toEqual([]);
        expect(inMemory().map((_bean) => _bean.weight)).toEqual([250]);
      });

      it('leaves the bean of the dialog as it was, so another try takes the part off once', async () => {
        await open();
        component.unfreezeWeight = 100;
        database.failingWrites.add('BEANS');

        await component.save();

        expect(component.bean.weight).toBe(250);
        expect(component.bean.cost).toBe(20);
        expect(component.bean.frozenGroupId).toBe('');

        database.failingWrites.clear();
        await component.save();

        expect(storedOriginal().weight).toBe(150);
        expect(storedOriginal().cost).toBe(12);
        expect(storedParts().map((_bean) => _bean.weight)).toEqual([100]);
        expect(component.bean.weight).toBe(150);
        expect(component.bean.cost).toBe(12);
        expect(component.bean.frozenGroupId).toBe(
          storedOriginal().frozenGroupId,
        );
        expect(dismiss).toHaveBeenCalledTimes(1);
      });

      it('changes nothing when only the write of the part fails', async () => {
        await open({ frozenGroupId: 'group-1' });
        component.unfreezeWeight = 100;
        database.failingWrites.add('BEANS');

        await component.save();

        expect(storedOriginal().weight).toBe(250);
        expect(storedParts()).toEqual([]);
        expect(inMemory().map((_bean) => _bean.weight)).toEqual([250]);
        expect(showMessage.calls.allArgs()).toEqual([SAVE_FAILED_MESSAGE]);
        expect(dismiss).not.toHaveBeenCalled();
      });
    });
  });
});
