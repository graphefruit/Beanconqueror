import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Bean } from '../../../../classes/bean/bean';
import { Brew } from '../../../../classes/brew/brew';
import { Config } from '../../../../classes/objectConfig/objectConfig';
import { Settings } from '../../../../classes/settings/settings';
import { StorageChanges, StorageClass } from '../../../../classes/storageClass';
import { BEAN_FREEZING_STORAGE_ENUM } from '../../../../enums/beans/beanFreezingStorage';
import { UIAlert } from '../../../../services/uiAlert';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../../services/uiBeanStorage';
import { UIFileHelper } from '../../../../services/uiFileHelper';
import { UIHelper } from '../../../../services/uiHelper';
import { UILog } from '../../../../services/uiLog';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { UIToast } from '../../../../services/uiToast';
import { MemoryDatabase } from '../../../../test-utils/memory-database';
import { BeanPopoverFrozenListComponent } from '../../bean-popover-frozen-list/bean-popover-frozen-list.component';
import { BeanPopoverFreezeComponent } from '../bean-popover-freeze.component';

const ORIGINAL_UUID = 'original-bean';
const UUID_PATTERN = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
// A 1x1 PNG, the smallest picture the browser can decode.
const DECODABLE_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const UNDECODABLE = 'AAAA';
const ERROR_MESSAGE: Parameters<UIAlert['showMessage']> = [
  'ERROR_OCCURED',
  'CARE',
  undefined,
  true,
];
const NOTHING_FROZEN_MESSAGE: Parameters<UIAlert['showMessage']> = [
  'BEAN_FREEZE_NOTHING_FROZEN',
  'CARE',
  undefined,
  true,
];

function clone<T>(value: T): T {
  return structuredClone(value);
}

function brewUsing(dose: number, ground = 0): Brew {
  return { bean_weight_in: dose, grind_weight: ground } as Brew;
}

describe('BeanPopoverFreezeComponent', () => {
  let component: BeanPopoverFreezeComponent;
  let fixture: ComponentFixture<BeanPopoverFreezeComponent>;
  let bean: Bean;

  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let uiBeanStorageSpy: jasmine.SpyObj<UIBeanStorage>;
  let uiBeanHelperSpy: jasmine.SpyObj<UIBeanHelper>;
  let uiToastSpy: jasmine.SpyObj<UIToast>;
  let uiAlertSpy: jasmine.SpyObj<UIAlert>;
  let uiFileHelperSpy: jasmine.SpyObj<UIFileHelper>;
  let uiHelperSpy: jasmine.SpyObj<UIHelper>;
  let settingsStorageSpy: jasmine.SpyObj<UISettingsStorage>;
  let platformSpy: jasmine.SpyObj<Platform>;
  let uiAnalyticsSpy: jasmine.SpyObj<UIAnalytics>;

  beforeEach(() => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', [
      'dismiss',
      'create',
    ]);
    uiBeanStorageSpy = jasmine.createSpyObj('UIBeanStorage', [
      'applyChanges',
      'update',
    ]);
    uiBeanHelperSpy = jasmine.createSpyObj('UIBeanHelper', [
      'generateFrozenId',
      'getAllBrewsForThisBean',
      'archiveBeanWithRatingQuestion',
    ]);
    uiToastSpy = jasmine.createSpyObj('UIToast', ['showInfoToast']);
    uiAlertSpy = jasmine.createSpyObj('UIAlert', [
      'showLoadingSpinner',
      'hideLoadingSpinner',
      'showMessage',
      'showConfirm',
    ]);
    uiFileHelperSpy = jasmine.createSpyObj('UIFileHelper', [
      'generateInternalPath',
      'writeInternalFileFromBase64',
      'readInternalFileAsBase64',
      'deleteInternalFile',
    ]);
    uiHelperSpy = jasmine.createSpyObj('UIHelper', [
      'toFixedIfNecessary',
      'cloneData',
    ]);
    settingsStorageSpy = jasmine.createSpyObj('UISettingsStorage', [
      'getSettings',
    ]);
    platformSpy = jasmine.createSpyObj('Platform', ['is']);
    uiAnalyticsSpy = jasmine.createSpyObj('UIAnalytics', ['trackEvent']);

    settingsStorageSpy.getSettings.and.returnValue(new Settings());
    uiBeanHelperSpy.generateFrozenId.and.returnValue('frozen-id-123');
    uiBeanHelperSpy.getAllBrewsForThisBean.and.returnValue([]);
    uiBeanStorageSpy.update.and.resolveTo(true);
    // The rounding is part of what is characterized here.
    uiHelperSpy.toFixedIfNecessary.and.callFake((value, digits) =>
      UIHelper.prototype.toFixedIfNecessary(value, digits),
    );
    uiHelperSpy.cloneData.and.callFake((data: any) =>
      JSON.parse(JSON.stringify(data)),
    );
    platformSpy.is.and.returnValue(false);

    TestBed.configureTestingModule({
      imports: [BeanPopoverFreezeComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: UIBeanStorage, useValue: uiBeanStorageSpy },
        { provide: UIBeanHelper, useValue: uiBeanHelperSpy },
        { provide: UIToast, useValue: uiToastSpy },
        { provide: UIAlert, useValue: uiAlertSpy },
        { provide: UIFileHelper, useValue: uiFileHelperSpy },
        { provide: UIHelper, useValue: uiHelperSpy },
        { provide: UISettingsStorage, useValue: settingsStorageSpy },
        { provide: Platform, useValue: platformSpy },
        { provide: UILog, useValue: jasmine.createSpyObj('UILog', ['error']) },
        { provide: UIAnalytics, useValue: uiAnalyticsSpy },
        ChangeDetectorRef,
      ],
    });

    // These tests are about what is stored, not about the template: the
    // native date picker asks for a render when it answers.
    TestBed.overrideTemplate(BeanPopoverFreezeComponent, '');

    fixture = TestBed.createComponent(BeanPopoverFreezeComponent);
    component = fixture.componentInstance;

    bean = new Bean();
    bean.weight = 250;
    bean.frozenStorageType = BEAN_FREEZING_STORAGE_ENUM.UNKNOWN;
    component.bean = bean;
  });

  describe('ngOnInit', () => {
    it('should initialize frozenStorage and frozenNote from bean if present', () => {
      bean.frozenStorageType = BEAN_FREEZING_STORAGE_ENUM.VACUUM_SEALED;
      bean.frozenNote = 'Pre-existing note';

      component.ngOnInit();

      expect(component.frozenStorage).toBe(
        BEAN_FREEZING_STORAGE_ENUM.VACUUM_SEALED,
      );
      expect(component.frozenNote).toBe('Pre-existing note');
    });

    it('should keep default UNKNOWN frozenStorage if bean does not have a custom storage type', () => {
      component.ngOnInit();

      expect(component.frozenStorage).toBe(BEAN_FREEZING_STORAGE_ENUM.UNKNOWN);
      expect(component.frozenNote).toBe('');
    });
  });

  describe('saveWholePackage', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.frozenDate = '2026-10-17T10:00:00.000Z';
    });

    it('should set frozenStorageType to the selected storage type on bean when saving whole package', async () => {
      component.frozenStorage = BEAN_FREEZING_STORAGE_ENUM.COFFEE_JAR;
      component.frozenNote = 'In cellar';

      await component.saveWholePackage();

      expect(bean.frozenStorageType).toBe(
        BEAN_FREEZING_STORAGE_ENUM.COFFEE_JAR,
      );
      expect(bean.frozenDate).toBe('2026-10-17T10:00:00.000Z');
      expect(bean.frozenNote).toBe('In cellar');
      expect(bean.unfrozenDate).toBe('');
      expect(bean.frozenId).toBe('frozen-id-123');
      expect(uiBeanStorageSpy.update).toHaveBeenCalledWith(bean);
      expect(uiToastSpy.showInfoToast).toHaveBeenCalledWith(
        'BEAN_HAS_BEEN_FROZEN',
        true,
      );
      expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(
        undefined,
        undefined,
        BeanPopoverFreezeComponent.COMPONENT_ID,
      );
    });

    it('should preserve existing frozenId if already present', async () => {
      bean.frozenId = 'existing-frozen-id';
      component.frozenStorage = BEAN_FREEZING_STORAGE_ENUM.TUBE;

      await component.saveWholePackage();

      expect(bean.frozenId).toBe('existing-frozen-id');
      expect(bean.frozenStorageType).toBe(BEAN_FREEZING_STORAGE_ENUM.TUBE);
      expect(uiBeanHelperSpy.generateFrozenId).not.toHaveBeenCalled();
    });

    it('should reset unfrozenDate when re-freezing an unfrozen bean', async () => {
      bean.unfrozenDate = '2026-09-01T10:00:00.000Z';
      component.frozenStorage = BEAN_FREEZING_STORAGE_ENUM.ZIP_LOCK;

      await component.saveWholePackage();

      expect(bean.unfrozenDate).toBe('');
      expect(bean.frozenStorageType).toBe(BEAN_FREEZING_STORAGE_ENUM.ZIP_LOCK);
    });

    it('reports the freezing to the analytics without naming the bean', async () => {
      bean.name = 'Alpha';
      bean.roaster = 'Roastery';

      await component.saveWholePackage();

      expect(uiAnalyticsSpy.trackEvent.calls.allArgs()).toEqual([
        ['BEAN', 'FREEZE'],
      ]);
    });

    it('reports nothing to the analytics when the dialog is closed without saving', async () => {
      await component.dismiss();

      expect(uiAnalyticsSpy.trackEvent.calls.count()).toBe(0);
    });
  });

  describe('addOnePartialBag', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.freezePartialBagGrams = 50;
    });

    it('should use selected frozenStorage as default type for partial bag', () => {
      component.frozenStorage = BEAN_FREEZING_STORAGE_ENUM.TUBE;

      component.addOnePartialBag();

      expect(component.addedBags.length).toBe(1);
      expect(component.addedBags[0].type).toBe(BEAN_FREEZING_STORAGE_ENUM.TUBE);
      expect(component.addedBags[0].weight).toBe(50);
    });
  });

  describe('saveWholePackage, further cases', () => {
    beforeEach(() => {
      bean.cost = 20;
      uiBeanHelperSpy.getAllBrewsForThisBean.and.returnValue([brewUsing(50)]);
      component.ngOnInit();
      component.frozenDate = '2026-10-17T10:00:00.000Z';
    });

    it('leaves weight and cost of the bag as they are', async () => {
      await component.saveWholePackage();

      expect(bean.weight).toBe(250);
      expect(bean.cost).toBe(20);
      expect(uiBeanStorageSpy.update.calls.allArgs()).toEqual([[bean]]);
    });

    it('reports an update that rejects and neither closes nor claims success', async () => {
      uiBeanStorageSpy.update.and.rejectWith(new Error('disk full'));

      await component.saveWholePackage();

      expect(uiAlertSpy.showMessage.calls.allArgs()).toEqual([ERROR_MESSAGE]);
      expect(uiToastSpy.showInfoToast.calls.count()).toBe(0);
      expect(modalCtrlSpy.dismiss.calls.count()).toBe(0);
      expect(uiAnalyticsSpy.trackEvent.calls.count()).toBe(0);
    });

    it('reports an update that was not written and neither closes nor claims success', async () => {
      // What the storage answers when the database refuses the write.
      uiBeanStorageSpy.update.and.resolveTo(false);

      await component.saveWholePackage();

      expect(uiAlertSpy.showMessage.calls.allArgs()).toEqual([ERROR_MESSAGE]);
      expect(uiToastSpy.showInfoToast.calls.count()).toBe(0);
      expect(modalCtrlSpy.dismiss.calls.count()).toBe(0);
      expect(uiAnalyticsSpy.trackEvent.calls.count()).toBe(0);
    });
  });

  describe('save', () => {
    /** What the bean storage holds, by uuid. */
    let stored: Map<string, Bean>;
    /** Storage writes and dialog steps in the order they happened. */
    let steps: string[];
    /** The storage call as a plain spy: its fakes are not generic. */
    let applyChanges: jasmine.Spy;
    /** What was handed to the storage, one entry per save. */
    let saves: StorageChanges<Bean>[];
    /** The entries as they were handed to the storage for adding. */
    let handedToAdd: Bean[];
    let writtenFiles: Map<string, string>;
    let frozenListModal: {
      present: jasmine.Spy;
      onWillDismiss: jasmine.Spy;
    };

    function storeEntry(entry: Bean): Bean {
      const copy = clone(entry);
      copy.config.uuid = `copy-${handedToAdd.length}`;
      stored.set(copy.config.uuid, copy);
      return clone(copy);
    }

    /** Stores all of it, like the storage does with one save. */
    function saveAll(changes: StorageChanges<Bean>) {
      steps.push('save');
      saves.push(clone(changes));
      for (const entry of (changes.update ?? []) as Bean[]) {
        stored.set(entry.config.uuid, clone(entry));
      }
      for (const uuid of changes.remove ?? []) {
        stored.delete(uuid);
      }
      const added = (changes.add ?? []).map((entry) => {
        handedToAdd.push(clone(entry));
        return storeEntry(entry);
      });
      return Promise.resolve({ saved: true, added });
    }

    /** Opens the dialog for the bean as it is set up, with these brews. */
    function open(brews: Brew[] = []): void {
      stored.set(ORIGINAL_UUID, clone(bean));
      uiBeanHelperSpy.getAllBrewsForThisBean.and.returnValue(brews);
      component.ngOnInit();
    }

    function addBags(...weights: number[]): void {
      for (const weight of weights) {
        component.freezePartialBagGrams = weight;
        component.addOnePartialBag();
      }
    }

    function storedOriginal(): Bean {
      return stored.get(ORIGINAL_UUID);
    }

    function storedCopies(): Bean[] {
      return [...stored.values()].filter(
        (entry) => entry.config.uuid !== ORIGINAL_UUID,
      );
    }

    function storedWeight(): number {
      let weight = 0;
      for (const entry of stored.values()) {
        weight += entry.weight;
      }
      return weight;
    }

    beforeEach(() => {
      stored = new Map();
      steps = [];
      handedToAdd = [];
      saves = [];
      writtenFiles = new Map();

      applyChanges = jasmine.createSpy('applyChanges');
      Object.assign(uiBeanStorageSpy, { applyChanges });
      applyChanges.and.callFake(saveAll);

      uiAlertSpy.showLoadingSpinner.and.callFake(() => {
        steps.push('spinner shown');
        return Promise.resolve();
      });
      uiAlertSpy.hideLoadingSpinner.and.callFake(() => {
        steps.push('spinner hidden');
        return Promise.resolve();
      });
      uiAlertSpy.showConfirm.and.callFake(() => {
        steps.push('confirm');
        return Promise.resolve('YES');
      });
      uiAlertSpy.showMessage.and.callFake(() => {
        steps.push('message');
        return Promise.resolve();
      });
      uiBeanHelperSpy.archiveBeanWithRatingQuestion.and.callFake(() => {
        steps.push('archive');
        return Promise.resolve();
      });

      let frozenIds = 0;
      uiBeanHelperSpy.generateFrozenId.and.callFake(() => `F${++frozenIds}`);

      let files = 0;
      uiFileHelperSpy.generateInternalPath.and.callFake(
        (prefix: string, ending: string) =>
          Promise.resolve(`${prefix}-${++files}${ending}`),
      );
      uiFileHelperSpy.writeInternalFileFromBase64.and.callFake(
        (base64: string, path: string) => {
          writtenFiles.set(path, base64);
          return Promise.resolve({ path, fullpath: `/data/${path}` });
        },
      );
      uiFileHelperSpy.readInternalFileAsBase64.and.resolveTo(UNDECODABLE);
      uiFileHelperSpy.deleteInternalFile.and.callFake((path: string) => {
        writtenFiles.delete(path);
        return Promise.resolve();
      });

      frozenListModal = {
        present: jasmine.createSpy('present').and.callFake(() => {
          steps.push('list shown');
          return Promise.resolve();
        }),
        onWillDismiss: jasmine.createSpy('onWillDismiss').and.resolveTo({}),
      };
      modalCtrlSpy.create.and.resolveTo(
        frozenListModal as unknown as HTMLIonModalElement,
      );
      modalCtrlSpy.dismiss.and.callFake(() => {
        steps.push('dismiss');
        return Promise.resolve(true);
      });

      bean.name = 'Alpha';
      bean.config.uuid = ORIGINAL_UUID;
      bean.config.unix_timestamp = 1700000000;
      bean.weight = 250;
      bean.cost = 20;
      component.frozenDate = '2026-03-01T10:00:00.000Z';
    });

    describe('freezing a part of the bag', () => {
      it('stores a new bean for the bag and takes its weight off the original', async () => {
        open();
        addBags(100);

        await component.save();

        expect(storedCopies().length).toBe(1);
        expect(storedCopies()[0].weight).toBe(100);
        expect(storedOriginal().weight).toBe(150);
        expect(storedOriginal().frozenGroupId).toMatch(UUID_PATTERN);
        expect(storedCopies()[0].frozenGroupId).toBe(
          storedOriginal().frozenGroupId,
        );
        // The bag and the original go into the same save.
        expect(saves.length).toBe(1);
        expect(saves[0].add.length).toBe(1);
        expect(saves[0].update.length).toBe(1);
        expect(saves[0].remove).toBeUndefined();
        expect(uiAlertSpy.showConfirm.calls.count()).toBe(0);
      });

      it('splits the cost by weight', async () => {
        open();
        addBags(100);

        await component.save();

        expect(storedCopies()[0].cost).toBe(8);
        expect(storedOriginal().cost).toBe(12);
      });

      it('rounds the shares of the cost to two digits', async () => {
        bean.cost = 10;
        bean.weight = 300;
        open();
        addBags(100);

        await component.save();

        expect(storedCopies()[0].cost).toBe(3.33);
        expect(storedOriginal().cost).toBe(6.67);
      });

      it('keeps a bean without cost free of cost', async () => {
        bean.cost = 0;
        open();
        addBags(100);

        await component.save();

        expect(storedCopies()[0].cost).toBe(0);
        expect(storedOriginal().cost).toBe(0);
      });

      it('makes the new bean an entry of its own, frozen and not shared', async () => {
        bean.config.created_at = 5;
        bean.config.rev = 3;
        bean.frozenId = 'OLD';
        bean.unfrozenDate = '2026-02-01T10:00:00.000Z';
        bean.attachments = ['photo.jpg'];
        bean.internal_share_code = 'share-code';
        bean.shared = true;
        bean.qr_code = 'qr';
        bean.roaster = 'Roastery';
        open();
        addBags(100);

        await component.save();

        // Nothing of the identity or the change info of the original is kept.
        expect(handedToAdd[0].config).toEqual({ ...new Config() });
        const copy = storedCopies()[0];
        expect(copy.config.uuid).not.toBe(ORIGINAL_UUID);
        expect(copy.frozenId).toBe('F1');
        expect(copy.frozenDate).toBe('2026-03-01T10:00:00.000Z');
        expect(copy.unfrozenDate).toBe('');
        expect(copy.attachments).toEqual([]);
        expect(copy.internal_share_code).toBe('');
        expect(copy.shared).toBe(false);
        expect(copy.qr_code).toBe('');
        expect(copy.name).toBe('Alpha');
        expect(copy.roaster).toBe('Roastery');
      });

      it('leaves everything but weight, cost and group of the original alone', async () => {
        bean.frozenId = 'OLD';
        bean.unfrozenDate = '2026-02-01T10:00:00.000Z';
        bean.attachments = ['photo.jpg'];
        bean.internal_share_code = 'share-code';
        bean.shared = true;
        bean.qr_code = 'qr';
        const before = clone(bean);
        open();
        addBags(100);

        await component.save();

        expect(storedOriginal()).toEqual(
          Object.assign(before, {
            weight: 150,
            cost: 12,
            frozenGroupId: storedOriginal().frozenGroupId,
          }),
        );
      });

      it('gives every bag its own storage type and the note', async () => {
        open();
        component.frozenNote = 'Top drawer';
        component.frozenStorage = BEAN_FREEZING_STORAGE_ENUM.TUBE;
        addBags(50);
        component.frozenStorage = BEAN_FREEZING_STORAGE_ENUM.ZIP_LOCK;
        addBags(50);

        await component.save();

        expect(storedCopies().map((copy) => copy.frozenStorageType)).toEqual([
          BEAN_FREEZING_STORAGE_ENUM.TUBE,
          BEAN_FREEZING_STORAGE_ENUM.ZIP_LOCK,
        ]);
        expect(storedCopies().map((copy) => copy.frozenNote)).toEqual([
          'Top drawer',
          'Top drawer',
        ]);
        // The note and type of the original are not touched.
        expect(storedOriginal().frozenNote).toBe('');
        expect(storedOriginal().frozenStorageType).toBe(
          BEAN_FREEZING_STORAGE_ENUM.UNKNOWN,
        );
      });

      it('stores one bean per bag and lists them in the order of the bags', async () => {
        open();
        addBags(100, 60, 40);

        await component.save();

        expect(storedCopies().map((copy) => copy.weight)).toEqual([
          100, 60, 40,
        ]);
        expect(storedCopies().map((copy) => copy.frozenId)).toEqual([
          'F1',
          'F2',
          'F3',
        ]);
        expect(component.allNewCreatedBeans.map((b) => b.weight)).toEqual([
          100, 60, 40,
        ]);
        expect(component.allNewCreatedBeans.map((b) => b.config.uuid)).toEqual(
          storedCopies().map((copy) => copy.config.uuid),
        );
        expect(
          component.allNewCreatedBeans.every((b) => b instanceof Bean),
        ).toBeTrue();
        expect(storedOriginal().weight).toBe(50);
        expect(storedOriginal().cost).toBe(4);
      });

      it('uses the group of a bean that was partly frozen before', async () => {
        bean.frozenGroupId = 'group-of-last-time';
        open();
        addBags(100, 50);

        await component.save();

        expect(storedOriginal().frozenGroupId).toBe('group-of-last-time');
        expect(storedCopies().map((copy) => copy.frozenGroupId)).toEqual([
          'group-of-last-time',
          'group-of-last-time',
        ]);
      });

      it('splits the green bean weight of a roasted bean by weight', async () => {
        bean.bean_roast_information.green_bean_weight = 300;
        open();
        addBags(100);

        await component.save();

        expect(storedCopies()[0].bean_roast_information.green_bean_weight).toBe(
          120,
        );
        expect(storedOriginal().bean_roast_information.green_bean_weight).toBe(
          180,
        );
      });

      it('rounds weights to one digit and loses nothing of the bag', async () => {
        bean.weight = 100;
        bean.cost = 10;
        open();
        addBags(33.3, 33.3, 33.3);

        await component.save();

        expect(storedCopies().map((copy) => copy.weight)).toEqual([
          33.3, 33.3, 33.3,
        ]);
        expect(storedOriginal().weight).toBe(0.1);
        expect(storedWeight()).toBeCloseTo(100, 6);
        expect(storedCopies().map((copy) => copy.cost)).toEqual([
          3.33, 3.33, 3.33,
        ]);
        expect(storedOriginal().cost).toBe(0.01);
      });

      it('leaves the brewed part with the original', async () => {
        bean.cost = 12.5;
        open([brewUsing(16.5), brewUsing(0, 20)]);
        expect(component.leftOverBeanBagWeight).toBe(213.5);
        addBags(100);

        await component.save();

        expect(storedCopies()[0].weight).toBe(100);
        expect(storedCopies()[0].cost).toBe(5);
        expect(storedOriginal().weight).toBe(150);
        expect(storedOriginal().cost).toBe(7.5);
        expect(
          uiBeanHelperSpy.archiveBeanWithRatingQuestion.calls.count(),
        ).toBe(0);
      });
    });

    describe('freezing all that is left', () => {
      it('deletes a bean without brews when the user agrees', async () => {
        open();
        addBags(125, 125);

        await component.save();

        expect(uiAlertSpy.showConfirm.calls.allArgs()).toEqual([
          ['BEAN_POPOVER_FROZEN_DELETE_BEAN_MESSAGE', 'CARE', true],
        ]);
        expect(saves.length).toBe(1);
        expect(saves[0].remove).toEqual([ORIGINAL_UUID]);
        expect(saves[0].update).toBeUndefined();
        expect(stored.has(ORIGINAL_UUID)).toBeFalse();
        expect(storedWeight()).toBe(250);
        expect(storedCopies().map((copy) => copy.cost)).toEqual([10, 10]);
      });

      it('empties a bean without brews when the user wants to keep it', async () => {
        bean.bean_roast_information.green_bean_weight = 300;
        open();
        addBags(125, 125);
        uiAlertSpy.showConfirm.and.resolveTo('NO');

        await component.save();

        expect(saves.length).toBe(1);
        expect(saves[0].remove).toBeUndefined();
        expect(storedOriginal().weight).toBe(0);
        expect(storedOriginal().bean_roast_information.green_bean_weight).toBe(
          0,
        );
        expect(storedWeight()).toBe(250);
        expect(
          storedCopies().map(
            (copy) => copy.bean_roast_information.green_bean_weight,
          ),
        ).toEqual([150, 150]);
      });

      it('known gap: the emptied bean keeps its whole cost and gets no group', async () => {
        open();
        addBags(125, 125);
        uiAlertSpy.showConfirm.and.resolveTo('NO');

        await component.save();

        // 20 was paid; the two bags and the empty original add up to 40.
        expect(storedOriginal().cost).toBe(20);
        expect(storedCopies().map((copy) => copy.cost)).toEqual([10, 10]);
        expect(storedOriginal().frozenGroupId).toBe('');
        expect(storedCopies()[0].frozenGroupId).toMatch(UUID_PATTERN);
      });

      it('keeps a bean with brews, reduced to what was brewed, and archives it', async () => {
        bean.bean_roast_information.green_bean_weight = 300;
        open([brewUsing(30), brewUsing(0, 20)]);
        addBags(100, 100);

        await component.save();

        expect(saves.length).toBe(1);
        expect(saves[0].remove).toBeUndefined();
        expect(uiAlertSpy.showConfirm.calls.count()).toBe(0);
        expect(storedOriginal().weight).toBe(50);
        expect(storedOriginal().cost).toBe(4);
        expect(storedOriginal().bean_roast_information.green_bean_weight).toBe(
          60,
        );
        expect(storedOriginal().frozenGroupId).toMatch(UUID_PATTERN);
        expect(storedCopies().map((copy) => copy.frozenGroupId)).toEqual([
          storedOriginal().frozenGroupId,
          storedOriginal().frozenGroupId,
        ]);
        expect(storedWeight()).toBe(250);
        expect(uiAlertSpy.showMessage.calls.allArgs()).toEqual([
          [
            'BEAN_POPOVER_FROZEN_BEAN_WILL_BE_ARCHIVED_NOW_MESSAGE',
            'INFORMATION',
            'OK',
            true,
          ],
        ]);
        expect(
          uiBeanHelperSpy.archiveBeanWithRatingQuestion.calls.allArgs(),
        ).toEqual([[bean]]);
        // The bean that is archived is the reduced one.
        expect(bean.weight).toBe(50);
        expect(bean.cost).toBe(4);
        expect(bean.frozenGroupId).toBe(storedOriginal().frozenGroupId);
        expect(steps).toEqual([
          'spinner shown',
          'save',
          'spinner hidden',
          'message',
          'archive',
          'dismiss',
          'list shown',
        ]);
      });

      it('shows the new beans also when the archive question cannot be shown', async () => {
        open([brewUsing(50)]);
        addBags(200);
        uiBeanHelperSpy.archiveBeanWithRatingQuestion.and.rejectWith(
          new Error('no modal'),
        );

        await component.save();

        // The freezing is done and is not reported as failed.
        expect(storedWeight()).toBe(250);
        expect(uiAlertSpy.showMessage.calls.allArgs()).not.toContain(
          NOTHING_FROZEN_MESSAGE,
        );
        expect(steps.slice(-2)).toEqual(['dismiss', 'list shown']);
      });

      it('asks about the original before anything is stored, then stores all with one save', async () => {
        open();
        addBags(125, 125);

        await component.save();

        expect(steps).toEqual([
          'confirm',
          'spinner shown',
          'save',
          'spinner hidden',
          'dismiss',
          'list shown',
        ]);
      });
    });

    describe('when the storage fails', () => {
      /** The storage keeps nothing of a save that failed. */
      function failToSave(): void {
        applyChanges.and.callFake((changes: StorageChanges<Bean>) => {
          steps.push('save');
          saves.push(clone(changes));
          return Promise.resolve({ saved: false, added: [] });
        });
      }

      function expectNothingChanged(): void {
        expect(storedCopies()).toEqual([]);
        expect(storedOriginal().weight).toBe(250);
        expect(storedOriginal().cost).toBe(20);
        expect(storedOriginal().frozenGroupId).toBe('');
        expect(storedWeight()).toBe(250);
        // The bean of the dialog as well: the message says so.
        expect(bean.weight).toBe(250);
        expect(bean.cost).toBe(20);
        expect(bean.frozenGroupId).toBe('');
        expect(component.allNewCreatedBeans).toEqual([]);
      }

      /** The message instead of the list; the dialog stays for another try. */
      function expectNothingFrozenInOpenDialog(): void {
        expect(steps.filter((step) => step === 'spinner hidden').length).toBe(
          1,
        );
        expect(uiAlertSpy.showMessage.calls.allArgs()).toEqual([
          NOTHING_FROZEN_MESSAGE,
        ]);
        expect(steps.indexOf('message')).toBeGreaterThan(
          steps.indexOf('spinner hidden'),
        );
        expect(modalCtrlSpy.dismiss.calls.count()).toBe(0);
        expect(modalCtrlSpy.create.calls.count()).toBe(0);
        expect(uiToastSpy.showInfoToast.calls.count()).toBe(0);
        expect(uiAnalyticsSpy.trackEvent.calls.count()).toBe(0);
      }

      it('changes nothing when the bags and the original could not be saved', async () => {
        open();
        addBags(100, 100);
        failToSave();

        await component.save();

        expect(saves.length).toBe(1);
        expectNothingChanged();
        expectNothingFrozenInOpenDialog();
      });

      it('keeps the original when it was to be deleted with the bags', async () => {
        open();
        addBags(250);
        failToSave();

        await component.save();

        expect(saves[0].remove).toEqual([ORIGINAL_UUID]);
        expect(stored.has(ORIGINAL_UUID)).toBeTrue();
        expectNothingChanged();
        expectNothingFrozenInOpenDialog();
      });

      it('keeps the weight of the original when it was to be emptied', async () => {
        open();
        addBags(250);
        uiAlertSpy.showConfirm.and.resolveTo('NO');
        failToSave();

        await component.save();

        expectNothingChanged();
        expectNothingFrozenInOpenDialog();
      });

      it('freezes the same bags on the next try', async () => {
        open();
        addBags(100, 100);
        failToSave();
        await component.save();
        applyChanges.and.callFake(saveAll);

        await component.save();

        expect(storedCopies().map((copy) => copy.weight)).toEqual([100, 100]);
        expect(storedCopies().map((copy) => copy.cost)).toEqual([8, 8]);
        expect(storedOriginal().weight).toBe(50);
        expect(storedWeight()).toBe(250);
        expect(component.allNewCreatedBeans.map((b) => b.config.uuid)).toEqual(
          storedCopies().map((copy) => copy.config.uuid),
        );
        expect(frozenListModal.present.calls.count()).toBe(1);
      });

      it('deletes the copied photos of the bags that were not saved', async () => {
        bean.attachments = ['photo.jpg'];
        open();
        component.copyAttachments = true;
        addBags(100, 100);
        failToSave();

        await component.save();

        expect(uiFileHelperSpy.deleteInternalFile.calls.allArgs()).toEqual([
          ['photo-1.jpg'],
          ['photo-2.jpg'],
        ]);
        expect(writtenFiles.size).toBe(0);
        expectNothingChanged();
        expectNothingFrozenInOpenDialog();
      });

      it('stores nothing when the question about the original cannot be asked', async () => {
        bean.attachments = ['photo.jpg'];
        open();
        component.copyAttachments = true;
        addBags(250);
        uiAlertSpy.showConfirm.and.rejectWith(new Error('no alert'));

        await component.save();

        expect(saves).toEqual([]);
        expect(uiFileHelperSpy.writeInternalFileFromBase64.calls.count()).toBe(
          0,
        );
        expectNothingChanged();
        expectNothingFrozenInOpenDialog();
      });

      it('stores nothing and deletes the copied photos when a photo cannot be copied', async () => {
        bean.attachments = ['photo.jpg'];
        open();
        component.copyAttachments = true;
        addBags(100, 100);
        uiFileHelperSpy.writeInternalFileFromBase64.and.callFake(
          (base64: string, path: string) => {
            if (path === 'photo-2.jpg') {
              return Promise.reject(new Error('disk full'));
            }
            writtenFiles.set(path, base64);
            return Promise.resolve({ path, fullpath: `/data/${path}` });
          },
        );

        await component.save();

        expect(saves).toEqual([]);
        expect(writtenFiles.size).toBe(0);
        expectNothingChanged();
        expectNothingFrozenInOpenDialog();
      });

      it('reports the failure also when a copied photo cannot be deleted', async () => {
        bean.attachments = ['photo.jpg'];
        open();
        component.copyAttachments = true;
        addBags(100);
        failToSave();
        uiFileHelperSpy.deleteInternalFile.and.rejectWith(new Error('gone'));

        await component.save();

        expectNothingChanged();
        expectNothingFrozenInOpenDialog();
      });

      it('reports a storage that rejects and closes the spinner', async () => {
        open();
        addBags(100, 100);
        applyChanges.and.rejectWith(new Error('disk full'));

        await component.save();

        expectNothingChanged();
        expectNothingFrozenInOpenDialog();
      });

      it('does not archive a finished bean that was not saved', async () => {
        open([brewUsing(50)]);
        addBags(200);
        failToSave();

        await component.save();

        expect(
          uiBeanHelperSpy.archiveBeanWithRatingQuestion.calls.count(),
        ).toBe(0);
        expectNothingChanged();
        expectNothingFrozenInOpenDialog();
      });
    });

    // The dialog offers no bag for such a bean; only save() itself is open.
    describe('a bean without weight', () => {
      beforeEach(() => {
        bean.weight = 0;
        uiAlertSpy.showConfirm.and.resolveTo('NO');
      });

      it('gives an empty bag no cost instead of failing on the division', async () => {
        open();
        component.addedBags = [
          { weight: 0, type: BEAN_FREEZING_STORAGE_ENUM.UNKNOWN },
        ];

        await component.save();

        expect(storedCopies()[0].cost).toBe(0);
        expect(storedCopies()[0].weight).toBe(0);
        expect(storedOriginal().cost).toBe(20);
      });

      it('known gap: a bag with weight gets an infinite cost and the original a negative weight', async () => {
        open();
        component.addedBags = [
          { weight: 10, type: BEAN_FREEZING_STORAGE_ENUM.UNKNOWN },
        ];

        await component.save();

        expect(storedCopies()[0].cost).toBe(Infinity);
        expect(storedOriginal().weight).toBe(-10);
        expect(storedOriginal().cost).toBe(-Infinity);
      });
    });

    describe('photos', () => {
      it('does not read or copy them unless asked to', async () => {
        bean.attachments = ['photo.jpg'];
        open();
        addBags(100);

        await component.save();

        expect(uiFileHelperSpy.readInternalFileAsBase64.calls.count()).toBe(0);
        expect(writtenFiles.size).toBe(0);
        expect(storedCopies()[0].attachments).toEqual([]);
        expect(storedOriginal().attachments).toEqual(['photo.jpg']);
      });

      it('copies a picture that cannot be decoded as it is', async () => {
        bean.attachments = ['first.png', 'second.jpg'];
        open();
        component.copyAttachments = true;
        addBags(100);

        await component.save();

        expect(
          uiFileHelperSpy.readInternalFileAsBase64.calls.allArgs(),
        ).toEqual([['first.png'], ['second.jpg']]);
        expect(storedCopies()[0].attachments).toEqual([
          'photo-1.png',
          'photo-2.jpg',
        ]);
        expect(writtenFiles.get('photo-1.png')).toBe(
          `data:image/png;base64,${UNDECODABLE}`,
        );
        expect(writtenFiles.get('photo-2.jpg')).toBe(
          `data:image/jpeg;base64,${UNDECODABLE}`,
        );
        expect(storedOriginal().attachments).toEqual([
          'first.png',
          'second.jpg',
        ]);
      });

      it('stores a picture that can be decoded as a JPEG', async () => {
        bean.attachments = ['first.png'];
        uiFileHelperSpy.readInternalFileAsBase64.and.resolveTo(DECODABLE_PNG);
        open();
        component.copyAttachments = true;
        addBags(100);

        await component.save();

        expect(storedCopies()[0].attachments).toEqual(['photo-1.jpg']);
        expect(writtenFiles.get('photo-1.jpg')).toMatch(
          /^data:image\/jpeg;base64,.+/,
        );
      });

      it('skips a photo that cannot be read and freezes anyway', async () => {
        bean.attachments = ['', 'lost.jpg', 'kept.png'];
        uiFileHelperSpy.readInternalFileAsBase64.and.callFake((path: string) =>
          path === 'lost.jpg'
            ? Promise.reject(new Error('File does not exist'))
            : Promise.resolve(UNDECODABLE),
        );
        open();
        component.copyAttachments = true;
        addBags(100);

        await component.save();

        expect(
          uiFileHelperSpy.readInternalFileAsBase64.calls.allArgs(),
        ).toEqual([['lost.jpg'], ['kept.png']]);
        expect(storedCopies()[0].attachments).toEqual(['photo-1.png']);
        expect(storedOriginal().weight).toBe(150);
        expect(steps).toContain('list shown');
      });

      it('gives every bag files of its own', async () => {
        bean.attachments = ['first.png', 'second.jpg'];
        open();
        component.copyAttachments = true;
        addBags(100, 50);

        await component.save();

        expect(storedCopies().map((copy) => copy.attachments)).toEqual([
          ['photo-1.png', 'photo-2.jpg'],
          ['photo-3.png', 'photo-4.jpg'],
        ]);
        expect([...writtenFiles.keys()]).toEqual([
          'photo-1.png',
          'photo-2.jpg',
          'photo-3.png',
          'photo-4.jpg',
        ]);
        // The source files are read once, not once per bag.
        expect(uiFileHelperSpy.readInternalFileAsBase64.calls.count()).toBe(2);
      });
    });

    it('closes the spinner and the dialog and lists the new beans', async () => {
      open();
      addBags(100, 50);

      await component.save();

      expect(steps).toEqual([
        'spinner shown',
        'save',
        'spinner hidden',
        'dismiss',
        'list shown',
      ]);
      expect(modalCtrlSpy.dismiss.calls.allArgs()).toEqual([
        [undefined, undefined, BeanPopoverFreezeComponent.COMPONENT_ID],
      ]);
      expect(modalCtrlSpy.create.calls.allArgs()).toEqual([
        [
          {
            component: BeanPopoverFrozenListComponent,
            id: BeanPopoverFrozenListComponent.COMPONENT_ID,
            componentProps: { frozenBeansList: component.allNewCreatedBeans },
          },
        ],
      ]);
      expect(component.allNewCreatedBeans.length).toBe(2);
    });

    it('reports the freezing once to the analytics without naming the bean', async () => {
      bean.roaster = 'Roastery';
      open();
      addBags(100, 50);

      await component.save();

      expect(uiAnalyticsSpy.trackEvent.calls.allArgs()).toEqual([
        ['BEAN', 'FREEZE'],
      ]);
    });
  });

  describe('bags', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('offers what is left after the brews', () => {
      uiBeanHelperSpy.getAllBrewsForThisBean.and.returnValue([
        brewUsing(16.5),
        brewUsing(0, 20),
      ]);

      component.ngOnInit();

      expect(component.getUsedWeightCount()).toBe(36.5);
      expect(component.leftOverBeanBagWeight).toBe(213.5);
    });

    it('adds up the weight of the bags', () => {
      expect(component.getActualFreezingQuantity()).toBe(0);

      component.addedBags = [
        { weight: 100, type: BEAN_FREEZING_STORAGE_ENUM.UNKNOWN },
        { weight: 50.5, type: BEAN_FREEZING_STORAGE_ENUM.TUBE },
      ];

      expect(component.getActualFreezingQuantity()).toBe(150.5);
    });

    it('allows a bag only with a weight that is still in the bag', () => {
      const disabledFor = (grams: number) => {
        component.freezePartialBagGrams = grams;
        return component.isAddingBagDisabled();
      };
      component.addedBags = [
        { weight: 100, type: BEAN_FREEZING_STORAGE_ENUM.UNKNOWN },
      ];

      expect(disabledFor(0)).toBeTrue();
      expect(disabledFor(-5)).toBeTrue();
      expect(disabledFor(150.1)).toBeTrue();
      expect(disabledFor(150)).toBeFalse();
      expect(disabledFor(0.1)).toBeFalse();
    });

    it('allows the bag that fills the rest despite the inexact sum', () => {
      bean.weight = 0.3;
      component.ngOnInit();
      component.addedBags = [
        { weight: 0.1, type: BEAN_FREEZING_STORAGE_ENUM.UNKNOWN },
      ];
      component.freezePartialBagGrams = 0.2;

      expect(component.isAddingBagDisabled()).toBeFalse();
    });

    it('cuts the proposed weight down to the rest after a bag', () => {
      component.freezePartialBagGrams = 100;

      component.addOnePartialBag();
      expect(component.freezePartialBagGrams).toBe(100);

      component.addOnePartialBag();
      expect(component.freezePartialBagGrams).toBe(50);
      expect(component.addedBags.map((bag) => bag.weight)).toEqual([100, 100]);
    });

    it('takes the weight of a bag as a number when the input delivers text', () => {
      component.freezePartialBagGrams = '62.5' as unknown as number;

      component.addOnePartialBag();

      expect(component.addedBags[0].weight).toBe(62.5);
    });

    it('fills the bag with as many bags as fit and proposes the rest', () => {
      component.freezePartialBagGrams = 100;
      component.frozenStorage = BEAN_FREEZING_STORAGE_ENUM.VACUUM_SEALED;

      component.addMaxPartialBags();

      expect(component.addedBags).toEqual([
        { weight: 100, type: BEAN_FREEZING_STORAGE_ENUM.VACUUM_SEALED },
        { weight: 100, type: BEAN_FREEZING_STORAGE_ENUM.VACUUM_SEALED },
      ]);
      expect(component.freezePartialBagGrams).toBe(50);
      expect(component.isAddingBagDisabled()).toBeFalse();
    });

    it('proposes nothing more when the bags use up the bean', () => {
      component.freezePartialBagGrams = 125;

      component.addMaxPartialBags();

      expect(component.addedBags.map((bag) => bag.weight)).toEqual([125, 125]);
      expect(component.freezePartialBagGrams).toBe(0);
      expect(component.isAddingBagDisabled()).toBeTrue();
    });

    it('fills what earlier bags left over', () => {
      component.addedBags = [
        { weight: 130, type: BEAN_FREEZING_STORAGE_ENUM.UNKNOWN },
      ];
      component.freezePartialBagGrams = 33.3;

      component.addMaxPartialBags();

      expect(component.addedBags.map((bag) => bag.weight)).toEqual([
        130, 33.3, 33.3, 33.3,
      ]);
      expect(component.freezePartialBagGrams).toBe(20.1);
    });

    it('removes a bag and keeps a proposal that still fits', () => {
      component.freezePartialBagGrams = 100;
      component.addMaxPartialBags();

      component.deleteBag(0);

      expect(component.addedBags.map((bag) => bag.weight)).toEqual([100]);
      expect(component.freezePartialBagGrams).toBe(50);
    });

    it('cuts a proposal above the rest down when a bag is removed', () => {
      component.addedBags = [
        { weight: 100, type: BEAN_FREEZING_STORAGE_ENUM.UNKNOWN },
        { weight: 50, type: BEAN_FREEZING_STORAGE_ENUM.UNKNOWN },
      ];
      component.freezePartialBagGrams = 300;

      component.deleteBag(1);

      expect(component.addedBags.map((bag) => bag.weight)).toEqual([100]);
      expect(component.freezePartialBagGrams).toBe(150);
    });
  });

  describe('pinFormatter', () => {
    it('shows 0 for a value that is no number', () => {
      expect(component.pinFormatter('abc')).toBe('0');
      expect(component.pinFormatter(undefined)).toBe('0');
    });

    it('shows at most two digits without trailing zeros', () => {
      expect(component.pinFormatter(0.30000000000000004)).toBe('0.3');
      expect(component.pinFormatter('1.50')).toBe('1.5');
      expect(component.pinFormatter(2.346)).toBe('2.35');
      expect(component.pinFormatter(4)).toBe('4');
    });
  });

  describe('chooseDate', () => {
    let event: jasmine.SpyObj<Event> & {
      target: { blur: jasmine.Spy };
      cancelBubble: boolean;
    };

    beforeEach(() => {
      event = Object.assign(
        jasmine.createSpyObj<Event>('Event', [
          'preventDefault',
          'stopImmediatePropagation',
          'stopPropagation',
        ]),
        { target: { blur: jasmine.createSpy('blur') }, cancelBubble: false },
      );
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date('2026-03-01T10:00:00.000Z'));
    });

    afterEach(() => {
      jasmine.clock().uninstall();
      delete (window as unknown as { cordova?: unknown }).cordova;
    });

    it('sets the date to now in the browser and keeps the click to itself', () => {
      component.chooseDate(event);

      expect(component.frozenDate).toBe('2026-03-01T10:00:00.000Z');
      expect(event.target.blur.calls.count()).toBe(1);
      expect(event.preventDefault.calls.count()).toBe(1);
      expect(event.stopPropagation.calls.count()).toBe(1);
      expect(event.stopImmediatePropagation.calls.count()).toBe(1);
      expect(event.cancelBubble).toBeTrue();
    });

    it('takes the date from the native picker on a device', () => {
      const show = jasmine.createSpy('show');
      (window as unknown as { cordova: unknown }).cordova = {
        plugins: { DateTimePicker: { show } },
      };
      platformSpy.is.and.callFake((name) => name === 'capacitor');
      component.ngOnInit();

      component.chooseDate(event);

      // Nothing is set until the picker answers.
      expect(component.frozenDate).toBe('');
      const options = show.calls.mostRecent().args[0];
      expect(options.mode).toBe('date');
      expect(options.date).toEqual(new Date('2026-03-01T10:00:00.000Z'));

      options.success(new Date('2026-02-14T08:30:00.000Z'));
      expect(component.frozenDate).toBe('2026-02-14T08:30:00.000Z');

      // Clearing the date in the picker.
      options.success(undefined);
      expect(component.frozenDate).toBe('');

      options.error();
      expect(component.frozenDate).toBe('');
    });
  });
});

describe('BeanPopoverFreezeComponent on the real bean storage', () => {
  let component: BeanPopoverFreezeComponent;
  let db: MemoryDatabase;
  let beanStorage: UIBeanStorage;
  let uiAlertSpy: jasmine.SpyObj<UIAlert>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  interface StoredBean {
    weight: number;
    config: { uuid: string };
  }

  /** Weights by stored order; the original comes first. */
  function weightsOf(entries: readonly unknown[]): number[] {
    return (entries as StoredBean[]).map((entry) => entry.weight);
  }

  function onDisk(): number[] {
    return weightsOf((db.values.get('BEANS') ?? []) as StoredBean[]);
  }

  async function openFor(...bags: number[]): Promise<void> {
    await beanStorage.initializeStorage().catch(() => undefined);
    component.ngOnInit();
    for (const weight of bags) {
      component.freezePartialBagGrams = weight;
      component.addOnePartialBag();
    }
  }

  beforeEach(() => {
    db = new MemoryDatabase();
    uiAlertSpy = jasmine.createSpyObj('UIAlert', [
      'showLoadingSpinner',
      'hideLoadingSpinner',
      'showMessage',
      'showConfirm',
    ]);
    modalCtrlSpy = jasmine.createSpyObj('ModalController', [
      'dismiss',
      'create',
    ]);
    modalCtrlSpy.create.and.resolveTo({
      present: () => Promise.resolve(),
      onWillDismiss: () => Promise.resolve({}),
    } as unknown as HTMLIonModalElement);
    const uiBeanHelperSpy = jasmine.createSpyObj('UIBeanHelper', [
      'generateFrozenId',
      'getAllBrewsForThisBean',
    ]);
    uiBeanHelperSpy.getAllBrewsForThisBean.and.returnValue([]);
    const uiHelperSpy = jasmine.createSpyObj('UIHelper', [
      'toFixedIfNecessary',
      'cloneData',
    ]);
    uiHelperSpy.toFixedIfNecessary.and.callFake((value, digits) =>
      UIHelper.prototype.toFixedIfNecessary(value, digits),
    );
    // Keeps the class of the bean, which the storage relies on.
    uiHelperSpy.cloneData.and.callFake((data: unknown) =>
      StorageClass.cloneData(data),
    );
    const settingsStorageSpy = jasmine.createSpyObj('UISettingsStorage', [
      'getSettings',
    ]);
    settingsStorageSpy.getSettings.and.returnValue(new Settings());

    TestBed.configureTestingModule({
      imports: [BeanPopoverFreezeComponent, TranslateModule.forRoot()],
      providers: [
        ...db.providers(),
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: UIBeanHelper, useValue: uiBeanHelperSpy },
        { provide: UIToast, useValue: {} },
        { provide: UIAlert, useValue: uiAlertSpy },
        { provide: UIFileHelper, useValue: {} },
        { provide: UIHelper, useValue: uiHelperSpy },
        { provide: UISettingsStorage, useValue: settingsStorageSpy },
        { provide: Platform, useValue: { is: () => false } },
        {
          provide: UIAnalytics,
          useValue: jasmine.createSpyObj('UIAnalytics', ['trackEvent']),
        },
      ],
    });
    TestBed.overrideTemplate(BeanPopoverFreezeComponent, '');

    const bean = new Bean();
    bean.config.uuid = ORIGINAL_UUID;
    bean.weight = 250;
    bean.cost = 20;
    db.values.set('BEANS', [structuredClone({ ...bean })]);

    beanStorage = TestBed.inject(UIBeanStorage);
    component = TestBed.createComponent(
      BeanPopoverFreezeComponent,
    ).componentInstance;
    component.bean = bean;
  });

  it('stores the bags and the reduced original with one save', async () => {
    await openFor(100, 100);

    await component.save();

    expect(onDisk()).toEqual([50, 100, 100]);
    expect(db.writes('BEANS')).toBe(1);
    expect(component.bean.weight).toBe(50);
    expect(uiAlertSpy.showMessage.calls.count()).toBe(0);
    expect(modalCtrlSpy.dismiss.calls.count()).toBe(1);
    expect(modalCtrlSpy.create.calls.count()).toBe(1);
  });

  it('stores 60 bags of one gram with one save', async () => {
    await openFor(...Array.from({ length: 60 }, () => 1));

    await component.save();

    expect(db.writes('BEANS')).toBe(1);
    expect(onDisk()).toEqual([190, ...Array.from({ length: 60 }, () => 1)]);
    expect(component.allNewCreatedBeans.length).toBe(60);
  });

  it('stores the bags and deletes the original with one save', async () => {
    await openFor(250);
    uiAlertSpy.showConfirm.and.resolveTo('YES');

    await component.save();

    expect(db.writes('BEANS')).toBe(1);
    expect(onDisk()).toEqual([250]);
    expect(db.uuids('BEANS')).not.toContain(ORIGINAL_UUID);
    expect(db.journal().map((note) => note.uuid)).toEqual([ORIGINAL_UUID]);
    expect(modalCtrlSpy.create.calls.count()).toBe(1);
  });

  for (const original of ['reduced', 'deleted']) {
    it(`leaves only the full original, stored and in memory, when bags and the ${original} original could not be written`, async () => {
      await openFor(...(original === 'deleted' ? [250] : [100, 100]));
      uiAlertSpy.showConfirm.and.resolveTo('YES');
      db.failingWrites.add('BEANS');

      await component.save();

      // What the message says: nothing frozen, the bean unchanged.
      expect(onDisk()).toEqual([250]);
      expect(weightsOf(beanStorage.getRawEntries())).toEqual([250]);
      expect(db.uuids('BEANS')).toEqual([ORIGINAL_UUID]);
      expect(db.journal()).toEqual([]);
      expect(component.bean.weight).toBe(250);
      expect(component.bean.cost).toBe(20);
      expect(component.allNewCreatedBeans).toEqual([]);
      expect(uiAlertSpy.showMessage.calls.allArgs()).toEqual([
        NOTHING_FROZEN_MESSAGE,
      ]);
      expect(uiAlertSpy.hideLoadingSpinner.calls.count()).toBe(1);
      expect(modalCtrlSpy.dismiss.calls.count()).toBe(0);
      expect(modalCtrlSpy.create.calls.count()).toBe(0);

      // The next write of the beans stores no bag either.
      db.failingWrites.clear();
      await beanStorage.update(component.bean);
      expect(onDisk()).toEqual([250]);
    });
  }

  it('freezes on the next try what could not be written before', async () => {
    await openFor(100, 100);
    db.failingWrites.add('BEANS');
    await component.save();
    db.failingWrites.clear();

    await component.save();

    expect(onDisk()).toEqual([50, 100, 100]);
    expect(modalCtrlSpy.create.calls.count()).toBe(1);
  });

  it('writes nothing when the beans could not be read', async () => {
    db.unreadable.add('BEANS');
    await openFor(100);

    await component.save();

    expect(db.set).not.toHaveBeenCalled();
    expect(onDisk()).toEqual([250]);
    expect(component.bean.weight).toBe(250);
    expect(uiAlertSpy.showMessage.calls.allArgs()).toEqual([
      NOTHING_FROZEN_MESSAGE,
    ]);
    expect(modalCtrlSpy.dismiss.calls.count()).toBe(0);
    expect(modalCtrlSpy.create.calls.count()).toBe(0);
  });
});
