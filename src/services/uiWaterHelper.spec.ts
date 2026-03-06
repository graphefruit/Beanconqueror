import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular/standalone';

import { Subject } from 'rxjs';

import { Brew } from '../classes/brew/brew';
import { Water } from '../classes/water/water';
import { UIAnalytics } from './uiAnalytics';
import { UIBrewStorage } from './uiBrewStorage';
import { UIWaterHelper } from './uiWaterHelper';

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

describe('UIWaterHelper', () => {
  let service: UIWaterHelper;
  let brewStorage: MockStorage;
  let modalController: ModalController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UIWaterHelper,
        { provide: UIBrewStorage, useClass: MockStorage },
        { provide: ModalController, useClass: MockModalController },
        { provide: UIAnalytics, useClass: MockUIAnalytics },
      ],
    });

    service = TestBed.inject(UIWaterHelper);
    brewStorage = TestBed.inject(UIBrewStorage) as unknown as MockStorage;
    modalController = TestBed.inject(ModalController);

    (UIBrewStorage as any).instance = brewStorage;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAllBrewsForThisWater', () => {
    it('should get all brews for this water', () => {
      const brew1 = new Brew();
      brew1.water = 'water1';
      const brew2 = new Brew();
      brew2.water = 'water2';

      spyOn(brewStorage, 'getAllEntries').and.returnValue([brew1, brew2]);

      const result = service.getAllBrewsForThisWater('water1');
      expect(result.length).toBe(1);
      expect(result[0].water).toBe('water1');
    });

    it('should clear cache when brew storage updates', () => {
      spyOn(brewStorage, 'getAllEntries').and.returnValue([]);
      service.getAllBrewsForThisWater('water99');
      expect(brewStorage.getAllEntries).toHaveBeenCalledTimes(1);

      // Trigger update
      brewStorage.triggerEvent();

      // Call again
      service.getAllBrewsForThisWater('water99');
      expect(brewStorage.getAllEntries).toHaveBeenCalledTimes(2);
    });
  });

  describe('Modals', () => {
    let modalSpy: jasmine.Spy;

    beforeEach(() => {
      modalSpy = spyOn(modalController, 'create').and.callThrough();
    });

    it('addWater should open modal', async () => {
      await service.addWater();
      expect(modalSpy).toHaveBeenCalled();
    });

    it('editWater should open modal', async () => {
      await service.editWater(new Water());
      expect(modalSpy).toHaveBeenCalled();
    });

    it('detailWater should open modal', async () => {
      await service.detailWater(new Water());
      expect(modalSpy).toHaveBeenCalled();
    });
  });
});
