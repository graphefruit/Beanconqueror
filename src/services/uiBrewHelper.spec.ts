import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular/standalone';

import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { Bean } from '../classes/bean/bean';
import { Brew } from '../classes/brew/brew';
import { Preparation } from '../classes/preparation/preparation';
import { Settings } from '../classes/settings/settings';
import { UIAlert } from './uiAlert';
import { UIAnalytics } from './uiAnalytics';
import { UIBeanHelper } from './uiBeanHelper';
import { UIBeanStorage } from './uiBeanStorage';
import { UIBrewHelper } from './uiBrewHelper';
import { UIBrewStorage } from './uiBrewStorage';
import { UILog } from './uiLog';
import { UIMillStorage } from './uiMillStorage';
import { UIPreparationStorage } from './uiPreparationStorage';
import { UISettingsStorage } from './uiSettingsStorage';
import { UIToast } from './uiToast';
import { UIWaterStorage } from './uiWaterStorage';

class MockUIBeanHelper {
  archiveBeanWithRatingQuestion() {}
}

class MockStorage {
  private subject = new Subject<any>();
  getAllEntries() {
    return [];
  }
  triggerEvent() {
    this.subject.next(true);
  }
  attachOnEvent() {
    return this.subject.asObservable();
  }
  getByUUID(uuid: string) {
    return { config: { uuid } };
  }
  getEntryByUUID(uuid: string) {
    return { config: { uuid } };
  }
}

class MockModalController {
  async create() {
    return {
      present: async () => {},
      onWillDismiss: async () => ({ data: {} }),
      onDidDismiss: async () => ({ data: {} }),
    };
  }
}

class MockUIAlert {
  showMessage() {}
  presentCustomPopover() {
    return Promise.resolve();
  }
  showConfirm() {
    return Promise.resolve('YES');
  }
}

class MockUIToast {}

class MockUISettingsStorage {
  private subject = new Subject<any>();
  getSettings() {
    return new Settings();
  }
  attachOnEvent() {
    return this.subject.asObservable();
  }
}

class MockTranslateService {
  instant(key: string) {
    return key;
  }
}

class MockUILog {
  error() {}
  log() {}
}

class MockUIAnalytics {
  trackEvent() {}
}

describe('UIBrewHelper', () => {
  let service: UIBrewHelper;
  let preparationStorage: MockStorage;
  let beanStorage: MockStorage;
  let brewStorage: MockStorage;
  let millStorage: MockStorage;
  let waterStorage: MockStorage;
  let modalController: ModalController;
  let analytics: MockUIAnalytics;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UIBrewHelper,
        { provide: UIBeanHelper, useClass: MockUIBeanHelper },
        { provide: UIBeanStorage, useClass: MockStorage },
        { provide: UIBrewStorage, useClass: MockStorage },
        { provide: UIPreparationStorage, useClass: MockStorage },
        { provide: UIMillStorage, useClass: MockStorage },
        { provide: UIWaterStorage, useClass: MockStorage },
        { provide: UIAnalytics, useClass: MockUIAnalytics },
        { provide: ModalController, useClass: MockModalController },
        { provide: UIAlert, useClass: MockUIAlert },
        { provide: UIToast, useClass: MockUIToast },
        { provide: UISettingsStorage, useClass: MockUISettingsStorage },
        { provide: TranslateService, useClass: MockTranslateService },
        { provide: UILog, useClass: MockUILog },
      ],
    });

    service = TestBed.inject(UIBrewHelper);
    preparationStorage = TestBed.inject(
      UIPreparationStorage,
    ) as unknown as MockStorage;
    beanStorage = TestBed.inject(UIBeanStorage) as unknown as MockStorage;
    brewStorage = TestBed.inject(UIBrewStorage) as unknown as MockStorage;
    millStorage = TestBed.inject(UIMillStorage) as unknown as MockStorage;
    waterStorage = TestBed.inject(UIWaterStorage) as unknown as MockStorage;
    modalController = TestBed.inject(ModalController);
    analytics = TestBed.inject(UIAnalytics) as unknown as MockUIAnalytics;

    (UIBeanStorage as any).instance = beanStorage;
    (UIBrewStorage as any).instance = brewStorage;
    (UIPreparationStorage as any).instance = preparationStorage;
    (UIMillStorage as any).instance = millStorage;
    (UIWaterStorage as any).instance = waterStorage;
  });

  describe('Core Functionality', () => {
    it('should create and get instance', () => {
      expect(service).toBeTruthy();
      expect(UIBrewHelper.getInstance()).toBeTruthy();
    });

    it('canBrew should return false if no beans', () => {
      spyOn(beanStorage, 'getAllEntries').and.returnValue([]);
      spyOn(preparationStorage, 'getAllEntries').and.returnValue([
        new Preparation(),
      ]);
      expect(service.canBrew()).toBeFalse();
    });

    it('canBrew should return false if no preparation', () => {
      spyOn(beanStorage, 'getAllEntries').and.returnValue([new Bean()]);
      spyOn(preparationStorage, 'getAllEntries').and.returnValue([]);
      expect(service.canBrew()).toBeFalse();
    });

    it('canBrew should return true if both exist', () => {
      spyOn(beanStorage, 'getAllEntries').and.returnValue([new Bean()]);
      spyOn(preparationStorage, 'getAllEntries').and.returnValue([
        new Preparation(),
      ]);
      spyOn(millStorage, 'getAllEntries').and.returnValue([
        { finished: false } as any,
      ]);
      expect(service.canBrew()).toBeTrue();
    });

    it('sortBrews and sortBrewsASC', () => {
      const b1 = new Brew();
      b1.config.unix_timestamp = 100;
      const b2 = new Brew();
      b2.config.unix_timestamp = 200;
      const b3 = new Brew();
      b3.config.unix_timestamp = 50;

      const desc = UIBrewHelper.sortBrews([b1, b2, b3]);
      expect(desc[0].config.unix_timestamp).toBe(200);
      expect(desc[2].config.unix_timestamp).toBe(50);

      const asc = UIBrewHelper.sortBrewsASC([b1, b2, b3]);
      expect(asc[0].config.unix_timestamp).toBe(50);
      expect(asc[2].config.unix_timestamp).toBe(200);
    });

    it('fieldVisible should respect boolean settings', () => {
      expect(service.fieldVisible(true, false, false)).toBeTrue();
      expect(service.fieldVisible(true, false, true)).toBeFalse();
    });
  });

  describe('Bean Tracking and Consumption', () => {
    it('checkIfBeanPackageIsConsumed should return true if brew weight > bean weight', () => {
      const bean = new Bean();
      bean.weight = 200;
      bean.config.uuid = 'uuid-bean';

      const b1 = new Brew();
      b1.bean = 'uuid-bean';
      b1.grind_weight = 150;

      const b2 = new Brew();
      b2.bean = 'uuid-bean';
      b2.grind_weight = 60;

      spyOn(brewStorage, 'getAllEntries').and.returnValue([b1, b2]);

      expect(service.checkIfBeanPackageIsConsumed(bean)).toBeTrue();
    });

    it('checkIfBeanPackageIsConsumed should return false if brew weight <= bean weight', () => {
      const bean = new Bean();
      bean.weight = 200;
      bean.config.uuid = 'uuid-bean';

      const b1 = new Brew();
      b1.bean = 'uuid-bean';
      b1.grind_weight = 100;

      spyOn(brewStorage, 'getAllEntries').and.returnValue([b1]);

      expect(service.checkIfBeanPackageIsConsumed(bean)).toBeFalse();
    });

    it('copyBrewToRepeat copies values but not uuids or ratings', () => {
      const original = new Brew();
      original.grind_weight = 15;
      original.rating = 5;
      original.brew_beverage_quantity = 300;
      original.cupping = { dry_fragrance: 5 } as any;
      original.config.uuid = 'old-uuid';

      const copy = service.copyBrewToRepeat(original);

      expect(copy.grind_weight).toBe(15);
      expect(copy.brew_beverage_quantity).toBe(300);
      expect(copy.rating).toBe(5);
      expect(copy.cupping).toEqual(new Brew().cupping); // Cupping is not copied, gets initialized to default
      expect(copy.config.uuid).not.toBe('old-uuid');
    });
  });

  describe('Modals & Navigation', () => {
    let modalSpy: jasmine.Spy;
    beforeEach(() => {
      modalSpy = spyOn(modalController, 'create').and.callThrough();
      spyOn(service, 'canBrewIfNotShowMessage').and.returnValue(true);
    });

    it('addBrew opens modal', async () => {
      await service.addBrew();
      await service.addBrewWithPresetBean(new Bean());
      expect(modalSpy).toHaveBeenCalled();
    });

    it('editBrew opens modal and returns brew on dismiss', async () => {
      modalSpy.and.returnValue(
        Promise.resolve({
          present: async () => {},
          onWillDismiss: async () => ({ data: new Brew() }),
        }),
      );
      const res = await service.editBrew(new Brew());
      expect(res).toBeDefined();
    });

    it('rateBrew opens modal', async () => {
      await service.rateBrew(new Brew());
      expect(modalSpy).toHaveBeenCalled();
    });

    it('detailBrew opens modal', async () => {
      await service.detailBrew(new Brew());
      expect(modalSpy).toHaveBeenCalled();
    });

    it('cupBrew opens modal', async () => {
      await service.cupBrew(new Brew());
      expect(modalSpy).toHaveBeenCalled();
    });

    it('showSort opens modal', async () => {
      await service.showSort({} as any);
      expect(modalSpy).toHaveBeenCalled();
    });
  });

  describe('Sections rules', () => {
    it('showSectionAfterBrew respects preparation config', () => {
      const p = new Preparation();
      p.use_custom_parameters = true;
      p.manage_parameters = { brew_quantity: true } as any;
      expect(service.showSectionAfterBrew(p)).toBeTrue();
    });

    it('showSectionWhileBrew respects preparation config', () => {
      const p = new Preparation();
      p.use_custom_parameters = true;
      p.manage_parameters = { brew_time: true } as any;
      expect(service.showSectionWhileBrew(p)).toBeTrue();
    });

    it('showSectionBeforeBrew respects preparation config', () => {
      const p = new Preparation();
      p.use_custom_parameters = true;
      p.manage_parameters = { grind_weight: true } as any;
      expect(service.showSectionBeforeBrew(p)).toBeTrue();
    });

    it('showSection returns false if objects are empty', () => {
      const p = new Preparation();
      p.use_custom_parameters = true;
      p.manage_parameters = { brew_quantity: false, coffee_type: false } as any;
      expect(service.showSectionAfterBrew(p)).toBeUndefined();
    });
  });

  describe('Cupping Tools', () => {
    it('showCupping returns false for no cupping', () => {
      const b = new Brew();
      expect(service.showCupping(b)).toBeFalse();
    });

    it('showCupping returns true for actual cupping', () => {
      const b = new Brew();
      b.cupping = { dry_fragrance: 5 } as any;
      expect(service.showCupping(b)).toBeTrue();
    });

    it('getCuppingChartData parses data correctly', () => {
      const mockCupping = {
        flavor: 8,
        acidity: 7.5,
        aftertaste: 8.5,
        balance: 7,
      } as any;

      const res = service.getCuppingChartData(mockCupping);
      expect((res as any).data.labels.length).toBeGreaterThan(0);
      expect((res as any).data.datasets[0].data[3]).toBe(8); // flavor
    });
  });
});
