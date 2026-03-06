import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular/standalone';

import { Subject } from 'rxjs';

import { Brew } from '../classes/brew/brew';
import { Mill } from '../classes/mill/mill';
import { UIAnalytics } from './uiAnalytics';
import { UIBrewStorage } from './uiBrewStorage';
import { UIMillHelper } from './uiMillHelper';

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

describe('UIMillHelper', () => {
  let service: UIMillHelper;
  let brewStorage: MockStorage;
  let modalController: ModalController;
  let analytics: MockUIAnalytics;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UIMillHelper,
        { provide: UIBrewStorage, useClass: MockStorage },
        { provide: ModalController, useClass: MockModalController },
        { provide: UIAnalytics, useClass: MockUIAnalytics },
      ],
    });

    service = TestBed.inject(UIMillHelper);
    brewStorage = TestBed.inject(UIBrewStorage) as unknown as MockStorage;
    modalController = TestBed.inject(ModalController);
    analytics = TestBed.inject(UIAnalytics) as unknown as MockUIAnalytics;

    (UIBrewStorage as any).instance = brewStorage;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all brews for this mill', () => {
    const brew1 = new Brew();
    brew1.mill = 'mill1';
    const brew2 = new Brew();
    brew2.mill = 'mill2';

    spyOn(brewStorage, 'getAllEntries').and.returnValue([brew1, brew2]);

    const result = service.getAllBrewsForThisMill('mill1');
    expect(result.length).toBe(1);
    expect(result[0].mill).toBe('mill1');
  });

  it('should clear internal brews cache when brew storage updates', () => {
    spyOn(brewStorage, 'getAllEntries').and.returnValue([]);
    service.getAllBrewsForThisMill('mill99'); // Load cache
    expect(brewStorage.getAllEntries).toHaveBeenCalledTimes(1);

    // Trigger update
    brewStorage.triggerEvent();

    // Call again -> should reload again
    service.getAllBrewsForThisMill('mill99');
    expect(brewStorage.getAllEntries).toHaveBeenCalledTimes(2);
  });

  describe('Modals', () => {
    let modalSpy: jasmine.Spy;

    beforeEach(() => {
      modalSpy = spyOn(modalController, 'create').and.callThrough();
    });

    it('addMill should open modal', async () => {
      await service.addMill();
      expect(modalSpy).toHaveBeenCalled();
    });

    it('editMill should open modal', async () => {
      await service.editMill(new Mill());
      expect(modalSpy).toHaveBeenCalled();
    });

    it('detailMill should open modal', async () => {
      await service.detailMill(new Mill());
      expect(modalSpy).toHaveBeenCalled();
    });
  });
});
