import { TestBed } from '@angular/core/testing';

import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { ROASTS_ENUM } from '../../../enums/beans/roasts';
import { IBeanInformation } from '../../../interfaces/bean/iBeanInformation';
import { UIBeanStorage } from '../../uiBeanStorage';
import { UIBrewStorage } from '../../uiBrewStorage';
import { UIMillStorage } from '../../uiMillStorage';
import { UIPreparationStorage } from '../../uiPreparationStorage';
import { UnwrappedService } from '../unwrapped.service';

describe('UnwrappedService', () => {
  let service: UnwrappedService;
  let beanStorage: jasmine.SpyObj<UIBeanStorage>;
  let brewStorage: jasmine.SpyObj<UIBrewStorage>;
  let preparationStorage: jasmine.SpyObj<UIPreparationStorage>;
  let millStorage: jasmine.SpyObj<UIMillStorage>;

  beforeEach(() => {
    beanStorage = jasmine.createSpyObj('UIBeanStorage', [
      'getAllEntries',
      'getEntryByUUID',
    ]);
    brewStorage = jasmine.createSpyObj('UIBrewStorage', ['getAllEntries']);
    preparationStorage = jasmine.createSpyObj('UIPreparationStorage', [
      'getPreparationNameByUUID',
    ]);
    millStorage = jasmine.createSpyObj('UIMillStorage', ['getMillNameByUUID']);

    TestBed.configureTestingModule({
      providers: [
        UnwrappedService,
        { provide: UIBeanStorage, useValue: beanStorage },
        { provide: UIBrewStorage, useValue: brewStorage },
        { provide: UIPreparationStorage, useValue: preparationStorage },
        { provide: UIMillStorage, useValue: millStorage },
      ],
    });

    service = TestBed.inject(UnwrappedService);
  });

  describe('getAvailableYears', () => {
    it('should return unique descending years from beans buyDate and roastingDate', () => {
      const b0 = new Bean();
      b0.buyDate = '2026-02-01T00:00:00.000Z';

      const b1 = new Bean();
      b1.buyDate = '2025-03-01T00:00:00.000Z';

      const b2 = new Bean();
      b2.roastingDate = '2024-11-01T00:00:00.000Z';

      const b3 = new Bean();
      b3.buyDate = '2025-06-15T00:00:00.000Z';

      const b4 = new Bean(); // No dates

      beanStorage.getAllEntries.and.returnValue([b0, b1, b2, b3, b4]);

      expect(service.getAvailableYears()).toEqual([2026, 2025, 2024]);
    });
  });

  describe('getUnwrappedData with frozen beans', () => {
    it('should deduplicate frozen beans with the same frozenGroupId for totalBeans and metadata', () => {
      // Bean 1: normal, unfrozen
      const bean1 = new Bean();
      bean1.config.uuid = 'uuid-bean-1';
      bean1.name = 'Colombia Supremo';
      bean1.buyDate = '2026-01-10T00:00:00.000Z';
      bean1.roaster = 'Roaster A';
      bean1.roast = ROASTS_ENUM.CITY_ROAST;
      bean1.weight = 250;
      bean1.cost = 15;
      bean1.bean_information = [
        {
          country: 'Colombia',
          processing: 'Washed',
          variety: 'Castillo',
        } as IBeanInformation,
      ];

      // Bean 2: split into 3 frozen portions with frozenGroupId 'frozen-group-1'
      const frozenBag1 = new Bean();
      frozenBag1.config.uuid = 'uuid-frozen-bag-1';
      frozenBag1.name = 'Ethiopia Yirgacheffe';
      frozenBag1.buyDate = '2026-02-15T00:00:00.000Z';
      frozenBag1.frozenGroupId = 'frozen-group-1';
      frozenBag1.roaster = 'Roaster B';
      frozenBag1.roast = ROASTS_ENUM.CINNAMON_ROAST;
      frozenBag1.weight = 100;
      frozenBag1.cost = 10;
      frozenBag1.bean_information = [
        {
          country: 'Ethiopia',
          processing: 'Natural',
          variety: 'Heirloom',
        } as IBeanInformation,
      ];

      const frozenBag2 = new Bean();
      frozenBag2.config.uuid = 'uuid-frozen-bag-2';
      frozenBag2.name = 'Ethiopia Yirgacheffe';
      frozenBag2.buyDate = '2026-02-15T00:00:00.000Z';
      frozenBag2.frozenGroupId = 'frozen-group-1';
      frozenBag2.roaster = 'Roaster B';
      frozenBag2.roast = ROASTS_ENUM.CINNAMON_ROAST;
      frozenBag2.weight = 100;
      frozenBag2.cost = 10;
      frozenBag2.bean_information = [
        {
          country: 'Ethiopia',
          processing: 'Natural',
          variety: 'Heirloom',
        } as IBeanInformation,
      ];

      const frozenBag3 = new Bean();
      frozenBag3.config.uuid = 'uuid-frozen-bag-3';
      frozenBag3.name = 'Ethiopia Yirgacheffe';
      frozenBag3.buyDate = '2026-02-15T00:00:00.000Z';
      frozenBag3.frozenGroupId = 'frozen-group-1';
      frozenBag3.roaster = 'Roaster B';
      frozenBag3.roast = ROASTS_ENUM.CINNAMON_ROAST;
      frozenBag3.weight = 50;
      frozenBag3.cost = 5;
      frozenBag3.bean_information = [
        {
          country: 'Ethiopia',
          processing: 'Natural',
          variety: 'Heirloom',
        } as IBeanInformation,
      ];

      beanStorage.getAllEntries.and.returnValue([
        bean1,
        frozenBag1,
        frozenBag2,
        frozenBag3,
      ]);
      brewStorage.getAllEntries.and.returnValue([]);

      const stats = service.getUnwrappedData(2026);
      expect(stats).not.toBeNull();

      // Total beans should be 2: bean1 + the single master group 'frozen-group-1'
      expect(stats.totalBeans).toBe(2);

      // Total weight: 250 (bean1) + (100 + 100 + 50) = 500
      expect(stats.totalWeight).toBe(500);

      // Total cost: 15 (bean1) + (10 + 10 + 5) = 40
      expect(stats.totalCost).toBe(40);

      // Most expensive bean should be Ethiopia Yirgacheffe with aggregated cost 25 (over Colombia 15)
      expect(stats.mostExpensiveBean).not.toBeNull();
      expect(stats.mostExpensiveBean.name).toBe('Ethiopia Yirgacheffe');
      expect(stats.mostExpensiveBean.cost).toBe(25);

      // Top countries: Ethiopia should count ONCE (1), Colombia count ONCE (1)
      expect(stats.topCountries.length).toBe(2);
      expect(
        stats.topCountries.find((c) => c.country === 'Ethiopia').count,
      ).toBe(1);
      expect(
        stats.topCountries.find((c) => c.country === 'Colombia').count,
      ).toBe(1);

      // Top roasters: Roaster A (1), Roaster B (1)
      expect(stats.topRoasters.length).toBe(2);
      expect(
        stats.topRoasters.find((r) => r.roaster === 'Roaster B').count,
      ).toBe(1);
    });

    it('should aggregate brew ratings from multiple frozen bags of the same coffee for bestRatedBean', () => {
      const frozenBag1 = new Bean();
      frozenBag1.config.uuid = 'bag-1';
      frozenBag1.name = 'Kenya Nyeri';
      frozenBag1.roaster = 'Specialty Roasters';
      frozenBag1.buyDate = '2026-01-01T00:00:00.000Z';
      frozenBag1.frozenGroupId = 'frozen-kenya';

      const frozenBag2 = new Bean();
      frozenBag2.config.uuid = 'bag-2';
      frozenBag2.name = 'Kenya Nyeri';
      frozenBag2.roaster = 'Specialty Roasters';
      frozenBag2.buyDate = '2026-01-01T00:00:00.000Z';
      frozenBag2.frozenGroupId = 'frozen-kenya';

      beanStorage.getAllEntries.and.returnValue([frozenBag1, frozenBag2]);
      beanStorage.getEntryByUUID.and.callFake((uuid: string) => {
        if (uuid === 'bag-1') return frozenBag1;
        if (uuid === 'bag-2') return frozenBag2;
        return undefined;
      });

      const brew1 = new Brew();
      brew1.config.unix_timestamp = 1768474800; // 2026
      brew1.bean = 'bag-1';
      brew1.rating = 5;

      const brew2 = new Brew();
      brew2.config.unix_timestamp = 1768561200; // 2026
      brew2.bean = 'bag-2';
      brew2.rating = 4;

      brewStorage.getAllEntries.and.returnValue([brew1, brew2]);

      const stats = service.getUnwrappedData(2026);
      expect(stats).not.toBeNull();
      expect(stats.bestRatedBean).not.toBeNull();
      expect(stats.bestRatedBean.name).toBe('Kenya Nyeri');
      expect(stats.bestRatedBean.rating).toBe(4.5);
    });
  });
});
