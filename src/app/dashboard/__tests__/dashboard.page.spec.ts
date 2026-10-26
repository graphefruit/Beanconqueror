import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ModalController } from '@ionic/angular/standalone';

import { environment } from '../../../environments/environment';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIStatistic } from '../../../services/uiStatistic';
import {
  UnwrappedService,
  UnwrappedStats,
} from '../../../services/unwrapped/unwrapped.service';
import { DashboardPage } from '../dashboard.page';

describe('DashboardPage - Unwrapped visibility', () => {
  let component: DashboardPage;
  let unwrappedService: jasmine.SpyObj<UnwrappedService>;
  let originalFlag: boolean;

  const stats: UnwrappedStats = {
    year: 2026,
    totalBeans: 1,
    totalWeight: 250,
    topCountries: [],
    topRoasters: [],
    favoriteRoast: '',
    averageRating: 0,
    mostExpensiveBean: null,
    topProcessingMethods: [],
    topVarieties: [],
    topPreparations: [],
    topGrinders: [],
    totalCost: 0,
    totalBrews: 0,
    totalCaffeine: 0,
    averageBrewsPerDay: 0,
    mostActiveDay: { date: '', count: 0 },
    mostActiveHour: { hour: 0, count: 0 },
    mostUsedBean: null,
    bestRatedBean: null,
  };

  beforeEach(() => {
    originalFlag = environment.SHOW_UNWRAPPED;
    environment.SHOW_UNWRAPPED = false;
    jasmine.clock().install();

    unwrappedService = jasmine.createSpyObj<UnwrappedService>(
      'UnwrappedService',
      ['getUnwrappedData'],
    );
    unwrappedService.getUnwrappedData.and.returnValue(stats);

    TestBed.configureTestingModule({
      providers: [
        DashboardPage,
        { provide: UnwrappedService, useValue: unwrappedService },
        ...[
          UIStatistic,
          UIBrewStorage,
          UIBrewHelper,
          ChangeDetectorRef,
          Router,
          UIBeanStorage,
          UIBeanHelper,
          UISettingsStorage,
          UIPreparationStorage,
          UIMillStorage,
          ModalController,
        ].map((provide) => ({ provide, useValue: {} })),
      ],
    });
    component = TestBed.inject(DashboardPage);
  });

  afterEach(() => {
    environment.SHOW_UNWRAPPED = originalFlag;
    jasmine.clock().uninstall();
  });

  for (let month = 0; month < 11; month++) {
    it(`should hide Unwrapped in month ${month + 1} even with 2026 data`, () => {
      jasmine.clock().mockDate(new Date(2026, month, 15));

      expect(component.showUnwrapped).toBeFalse();
      expect(unwrappedService.getUnwrappedData).not.toHaveBeenCalled();
    });
  }

  it('should show Unwrapped from the start of December with 2026 data', () => {
    jasmine.clock().mockDate(new Date(2026, 11, 1));

    expect(component.showUnwrapped).toBeTrue();
    expect(unwrappedService.getUnwrappedData).toHaveBeenCalledWith(2026);
  });

  it('should hide Unwrapped in December without 2026 data', () => {
    jasmine.clock().mockDate(new Date(2026, 11, 15));
    unwrappedService.getUnwrappedData.and.returnValue(null);

    expect(component.showUnwrapped).toBeFalse();
  });

  it('should show the 2026 recap at the start of January 2027', () => {
    jasmine.clock().mockDate(new Date(2027, 0, 1));

    expect(component.showUnwrapped).toBeTrue();
    expect(unwrappedService.getUnwrappedData).toHaveBeenCalledWith(2026);
  });

  it('should show the 2026 recap through the end of January 2027', () => {
    jasmine.clock().mockDate(new Date(2027, 0, 31, 23, 59, 59));

    expect(component.showUnwrapped).toBeTrue();
    expect(unwrappedService.getUnwrappedData).toHaveBeenCalledWith(2026);
  });

  it('should hide Unwrapped in January without 2026 data', () => {
    jasmine.clock().mockDate(new Date(2027, 0, 15));
    unwrappedService.getUnwrappedData.and.returnValue(null);

    expect(component.showUnwrapped).toBeFalse();
  });

  it('should hide Unwrapped again at the start of February 2027', () => {
    jasmine.clock().mockDate(new Date(2027, 1, 1));

    expect(component.showUnwrapped).toBeFalse();
  });

  it('should not show the 2026 recap in December of another year', () => {
    jasmine.clock().mockDate(new Date(2027, 11, 1));

    expect(component.showUnwrapped).toBeFalse();
  });

  it('should allow the flag to override the date and missing data', () => {
    jasmine.clock().mockDate(new Date(2026, 9, 26));
    environment.SHOW_UNWRAPPED = true;
    unwrappedService.getUnwrappedData.and.returnValue(null);

    expect(component.showUnwrapped).toBeTrue();
    expect(unwrappedService.getUnwrappedData).not.toHaveBeenCalled();
  });
});
