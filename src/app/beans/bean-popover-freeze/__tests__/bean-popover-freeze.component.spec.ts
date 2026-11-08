import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular/standalone';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Bean } from '../../../../classes/bean/bean';
import { Settings } from '../../../../classes/settings/settings';
import { BEAN_FREEZING_STORAGE_ENUM } from '../../../../enums/beans/beanFreezingStorage';
import { UIAlert } from '../../../../services/uiAlert';
import { UIBeanHelper } from '../../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../../services/uiBeanStorage';
import { UIFileHelper } from '../../../../services/uiFileHelper';
import { UIHelper } from '../../../../services/uiHelper';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { UIToast } from '../../../../services/uiToast';
import { BeanPopoverFreezeComponent } from '../bean-popover-freeze.component';

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

  beforeEach(() => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', [
      'dismiss',
      'create',
    ]);
    uiBeanStorageSpy = jasmine.createSpyObj('UIBeanStorage', [
      'update',
      'removeByUUID',
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
    ]);
    uiHelperSpy = jasmine.createSpyObj('UIHelper', [
      'toFixedIfNecessary',
      'cloneData',
    ]);
    settingsStorageSpy = jasmine.createSpyObj('UISettingsStorage', [
      'getSettings',
    ]);
    platformSpy = jasmine.createSpyObj('Platform', ['is']);

    settingsStorageSpy.getSettings.and.returnValue(new Settings());
    uiBeanHelperSpy.generateFrozenId.and.returnValue('frozen-id-123');
    uiBeanHelperSpy.getAllBrewsForThisBean.and.returnValue([]);
    uiHelperSpy.toFixedIfNecessary.and.callFake((val: number) => val);
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
        ChangeDetectorRef,
      ],
    });

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
});
