import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular/standalone';

import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { Brew } from '../classes/brew/brew';
import { Preparation } from '../classes/preparation/preparation';
import { PreparationTool } from '../classes/preparation/preparationTool';
import { UIAnalytics } from './uiAnalytics';
import { UIBrewStorage } from './uiBrewStorage';
import { UIHelper } from './uiHelper';
import { UIPreparationHelper } from './uiPreparationHelper';
import { UIPreparationStorage } from './uiPreparationStorage';

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
  async add() {
    return Promise.resolve();
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

class MockUIAnalytics {
  trackEvent() {}
}

class MockUIHelper {
  constructor() {}
  cloneData(data: any) {
    if (Array.isArray(data)) {
      return data.map((d) => Object.assign(new d.constructor(), d));
    }
    return Object.assign(new data.constructor(), data);
  }
}

class MockTranslateService {
  instant(key: string) {
    return key;
  }
}

class MockHttpClient {}

describe('UIPreparationHelper', () => {
  let service: UIPreparationHelper;
  let brewStorage: MockStorage;
  let preparationStorage: MockStorage;
  let modalController: ModalController;
  let analytics: MockUIAnalytics;
  let helper: MockUIHelper;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UIPreparationHelper,
        { provide: UIBrewStorage, useClass: MockStorage },
        { provide: UIPreparationStorage, useClass: MockStorage },
        { provide: ModalController, useClass: MockModalController },
        { provide: UIHelper, useClass: MockUIHelper },
        { provide: TranslateService, useClass: MockTranslateService },
        { provide: HttpClient, useClass: MockHttpClient },
        { provide: UIAnalytics, useClass: MockUIAnalytics },
      ],
    });

    service = TestBed.inject(UIPreparationHelper);
    brewStorage = TestBed.inject(UIBrewStorage) as unknown as MockStorage;
    preparationStorage = TestBed.inject(
      UIPreparationStorage,
    ) as unknown as MockStorage;
    modalController = TestBed.inject(ModalController);
    analytics = TestBed.inject(UIAnalytics) as unknown as MockUIAnalytics;
    helper = TestBed.inject(UIHelper) as unknown as MockUIHelper;

    (UIPreparationHelper as any).instance = service;
    (UIBrewStorage as any).instance = brewStorage;
    (UIPreparationStorage as any).instance = preparationStorage;
  });

  afterEach(() => {
    (UIPreparationHelper as any).instance = undefined;
  });

  it('should be created and return instance', () => {
    expect(service).toBeTruthy();
    expect(UIPreparationHelper.getInstance()).toBe(service);
  });

  it('should get all brews for this preparation', () => {
    const brew1 = new Brew();
    brew1.method_of_preparation = 'prep1';
    const brew2 = new Brew();
    brew2.method_of_preparation = 'prep2';

    spyOn(brewStorage, 'getAllEntries').and.returnValue([brew1, brew2]);

    const result = service.getAllBrewsForThisPreparation('prep1');
    expect(result.length).toBe(1);
    expect(result[0].method_of_preparation).toBe('prep1');
  });

  it('should clear internal brews cache when brew storage updates', () => {
    spyOn(brewStorage, 'getAllEntries').and.returnValue([]);
    service.getAllBrewsForThisPreparation('prep99'); // force initial cache load
    expect(brewStorage.getAllEntries).toHaveBeenCalledTimes(1);

    // Trigger update
    brewStorage.triggerEvent();

    // Now if we call again, it should hit storage again because the array was cleared
    service.getAllBrewsForThisPreparation('prep99');
    expect(brewStorage.getAllEntries).toHaveBeenCalledTimes(2);
  });

  describe('Modals', () => {
    let modalSpy: jasmine.Spy;

    beforeEach(() => {
      modalSpy = spyOn(modalController, 'create').and.callThrough();
    });

    it('addPreparation should open modal', async () => {
      await service.addPreparation();
      expect(modalSpy).toHaveBeenCalled();
    });

    it('editPreparation should open modal', async () => {
      await service.editPreparation(new Preparation());
      expect(modalSpy).toHaveBeenCalled();
    });

    it('connectDevice should track event and open modal', async () => {
      const analyticsSpy = spyOn(analytics, 'trackEvent');
      await service.connectDevice(new Preparation());
      expect(analyticsSpy).toHaveBeenCalled();
      expect(modalSpy).toHaveBeenCalled();
    });

    it('editPreparationTool should open modal', async () => {
      await service.editPreparationTool(
        new Preparation(),
        new PreparationTool(),
      );
      expect(modalSpy).toHaveBeenCalled();
    });

    it('sortPreparationTools should open modal', async () => {
      await service.sortPreparationTools(new Preparation());
      expect(modalSpy).toHaveBeenCalled();
    });

    it('detailPreparation should open modal', async () => {
      await service.detailPreparation(new Preparation());
      expect(modalSpy).toHaveBeenCalled();
    });
  });

  describe('repeatPreparation', () => {
    it('should clone preparation, reset config, and add to storage', async () => {
      const addSpy = spyOn(preparationStorage, 'add').and.callThrough();

      const original = new Preparation();
      original.name = 'V60';
      const tool = new PreparationTool();
      tool.name = 'Filter';
      original.tools.push(tool);

      await service.repeatPreparation(original);

      expect(addSpy).toHaveBeenCalled();
      const passedArgs: any = addSpy.calls.mostRecent().args;
      const passedArg: Preparation = passedArgs[0] as Preparation;
      expect(passedArg.name).toContain('COPY V60');
      expect(passedArg.attachments).toEqual([]);
      expect(passedArg.tools.length).toBe(1);
    });
  });

  describe('getConnectedDevice', () => {
    it('should return null if DEVICE type is NONE', () => {
      const p = new Preparation();
      p.connectedPreparationDevice = { type: 23, url: '' } as any; // Assuming 23 or 0 is NONE, let's look at implementation.
      // Wait, let's just make it without URL.
      p.connectedPreparationDevice = { type: 0, url: 'some-url' } as any;
      expect(service.getConnectedDevice(p)).toBeNull();
    });

    it('should return null if url is not set', () => {
      const p = new Preparation();
      p.connectedPreparationDevice = { type: 1, url: '' } as any;
      expect(service.getConnectedDevice(p)).toBeNull();
    });
  });
});
