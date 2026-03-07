import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import {
  ActionSheetController,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { Bean } from '../classes/bean/bean';
import { Brew } from '../classes/brew/brew';
import { Settings } from '../classes/settings/settings';
import { UIAlert } from './uiAlert';
import { UIAnalytics } from './uiAnalytics';
import { UIBeanHelper } from './uiBeanHelper';
import { UIBeanStorage } from './uiBeanStorage';
import { UIBrewStorage } from './uiBrewStorage';
import { UIFileHelper } from './uiFileHelper';
import { UIHelper } from './uiHelper';
import { UILog } from './uiLog';
import { UISettingsStorage } from './uiSettingsStorage';
import { UIToast } from './uiToast';

class MockUIBrewStorage {
  private subject = new Subject<any>();
  attachOnEvent() {
    return this.subject.asObservable();
  }
  getAllEntries() {
    return [];
  }
  triggerEvent() {
    this.subject.next(true);
  }
}

class MockUIBeanStorage {
  private subject = new Subject<any>();
  attachOnEvent() {
    return this.subject.asObservable();
  }
  getAllEntries() {
    return [];
  }
  triggerEvent() {
    this.subject.next(true);
  }
}

class MockUIAnalytics {
  trackEvent() {}
}

class MockModalController {
  async create() {
    return {
      present: async () => {},
      onWillDismiss: async () => ({ data: {} }),
    };
  }
}

class MockActionSheetController {
  async create() {
    return {
      present: async () => {},
      onDidDismiss: async () => ({ role: 'cancel' }),
    };
  }
}

class MockUIAlert {
  async showLoadingSpinner() {}
  async hideLoadingSpinner() {}
  showMessage() {}
}

class MockUIToast {
  showInfoToast() {}
}

class MockUISettingsStorage {
  getSettings() {
    const s = new Settings();
    s.qr_scanner_information = true;
    (s as any).statistics = { enable_statistics: false };
    return s;
  }
}

class MockUIHelper {}
class MockTranslateService {
  instant(key: string) {
    return key;
  }
}
class MockUILog {
  error() {}
  log() {}
}
class MockUIFileHelper {}
class MockHttpClient {}

describe('UIBeanHelper', () => {
  let service: UIBeanHelper;
  let brewStorage: MockUIBrewStorage;
  let beanStorage: MockUIBeanStorage;
  let settingsStorage: MockUISettingsStorage;
  let modalController: ModalController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UIBeanHelper,
        { provide: UIBrewStorage, useClass: MockUIBrewStorage },
        { provide: UIBeanStorage, useClass: MockUIBeanStorage },
        { provide: UIAnalytics, useClass: MockUIAnalytics },
        { provide: ModalController, useClass: MockModalController },
        { provide: UIAlert, useClass: MockUIAlert },
        { provide: UIToast, useClass: MockUIToast },
        { provide: UISettingsStorage, useClass: MockUISettingsStorage },
        { provide: UIHelper, useClass: MockUIHelper },
        { provide: ActionSheetController, useClass: MockActionSheetController },
        { provide: TranslateService, useClass: MockTranslateService },
        { provide: UILog, useClass: MockUILog },
        { provide: UIFileHelper, useClass: MockUIFileHelper },
        { provide: HttpClient, useClass: MockHttpClient },
      ],
    });

    brewStorage = TestBed.inject(UIBrewStorage) as unknown as MockUIBrewStorage;
    beanStorage = TestBed.inject(UIBeanStorage) as unknown as MockUIBeanStorage;
    settingsStorage = TestBed.inject(
      UISettingsStorage,
    ) as unknown as MockUISettingsStorage;
    modalController = TestBed.inject(ModalController);
    service = TestBed.inject(UIBeanHelper);
  });

  describe('Initialization', () => {
    it('should be created and setup instance', () => {
      expect(service).toBeTruthy();
      expect(UIBeanHelper.getInstance()).toBeTruthy();
    });

    it('should reset stored arrays when events trigger', () => {
      // Accessing private fields just for test verification if needed via any
      // but triggering behavior is better
      brewStorage.triggerEvent();
      beanStorage.triggerEvent();
      // Should flush internal array. Testing consequence behavior:
      spyOn(brewStorage, 'getAllEntries').and.returnValue([]);
      service.getAllBrewsForThisBean('123');
      expect(brewStorage.getAllEntries).toHaveBeenCalled();
    });
  });

  describe('Visibility & Formats', () => {
    it('fieldVisible should return correct boolean', () => {
      expect(service.fieldVisible(true)).toBeTrue();
      expect(service.fieldVisible(false)).toBeFalse();
    });
  });

  describe('Getters', () => {
    it('getAllBrewsForThisBean should fetch from storage first time and filter', () => {
      const b1 = new Brew();
      b1.bean = '123';
      const b2 = new Brew();
      b2.bean = '456';
      spyOn(brewStorage, 'getAllEntries').and.returnValue([b1, b2]);

      const res = service.getAllBrewsForThisBean('123');
      expect(res.length).toBe(1);
      expect(res[0].bean).toBe('123');
      expect(brewStorage.getAllEntries).toHaveBeenCalledTimes(1);

      // Call again, shouldn't hit storage
      service.getAllBrewsForThisBean('123');
      expect(brewStorage.getAllEntries).toHaveBeenCalledTimes(1);
    });

    it('getAllRoastedBeansForThisGreenBean should fetch and filter', () => {
      const b1 = new Bean();
      b1.bean_roast_information = { bean_uuid: 'green1' } as any;
      const b2 = new Bean();
      b2.bean_roast_information = { bean_uuid: 'green2' } as any;

      spyOn(beanStorage, 'getAllEntries').and.returnValue([b1, b2]);
      const res = service.getAllRoastedBeansForThisGreenBean('green1');
      expect(res.length).toBe(1);
      expect(res[0].bean_roast_information.bean_uuid).toBe('green1');
    });

    it('getAllRoastedBeansForRoastingMachine should fetch and filter', () => {
      const b1 = new Bean();
      b1.bean_roast_information = { roaster_machine: 'mach1' } as any;
      const b2 = new Bean();
      b2.bean_roast_information = { roaster_machine: 'mach2' } as any;
      spyOn(beanStorage, 'getAllEntries').and.returnValue([b1, b2]);

      const res = service.getAllRoastedBeansForRoastingMachine('mach2');
      expect(res.length).toBe(1);
      expect(res[0].bean_roast_information.roaster_machine).toBe('mach2');
    });
  });

  describe('Modals and Popups', () => {
    let modalSpy: jasmine.Spy;
    beforeEach(() => {
      modalSpy = spyOn(modalController, 'create').and.callThrough();
    });

    it('__checkQRCodeScannerInformationPage should open modal if settings false', async () => {
      const mockSettings = new Settings();
      mockSettings.qr_scanner_information = false;
      spyOn(settingsStorage, 'getSettings').and.returnValue(mockSettings);

      await service.__checkQRCodeScannerInformationPage();
      expect(modalSpy).toHaveBeenCalled();
    });

    it('addBean should open add modal', async () => {
      await service.addBean();
      expect(modalSpy).toHaveBeenCalled();
      const args = modalSpy.calls.first().args[0];
      expect(args.componentProps.hide_toast_message).toBeFalse();
    });

    it('freezeBean should open freeze modal', async () => {
      await service.freezeBean(new Bean());
      expect(modalSpy).toHaveBeenCalled();
    });

    it('unfreezeBean should open unfreeze modal', async () => {
      await service.unfreezeBean(new Bean());
      expect(modalSpy).toHaveBeenCalled();
    });

    it('generateQRCode should open modal', async () => {
      await service.generateQRCode(new Bean());
      expect(modalSpy).toHaveBeenCalled();
    });

    it('showBeans should open modal list', async () => {
      await service.showBeans([]);
      expect(modalSpy).toHaveBeenCalled();
    });

    it('editBean should open edit modal', async () => {
      await service.editBean(new Bean());
      expect(modalSpy).toHaveBeenCalled();
    });

    it('detailBean should open detail modal', async () => {
      await service.detailBean(new Bean());
      expect(modalSpy).toHaveBeenCalled();
    });

    it('archiveBeanWithRatingQuestion should open check modal', async () => {
      await service.archiveBeanWithRatingQuestion(new Bean());
      expect(modalSpy).toHaveBeenCalled();
    });

    it('cupBean should open cupping modal', async () => {
      await service.cupBean(new Bean());
      expect(modalSpy).toHaveBeenCalled();
    });
  });

  describe('generateFrozenId', () => {
    it('should generate a frozen id', () => {
      const id = service.generateFrozenId();
      expect(id).toBeDefined();
    });
  });
});
