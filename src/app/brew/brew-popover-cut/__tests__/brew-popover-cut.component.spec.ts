import { ChangeDetectorRef, NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular/standalone';

import { TranslateService } from '@ngx-translate/core';

import { Brew } from 'src/classes/brew/brew';
import { BrewFlow } from 'src/classes/brew/brewFlow';
import { GraphHelperService } from '../../../../services/graphHelper/graph-helper.service';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { BrewPopoverCutComponent } from '../brew-popover-cut.component';

describe('BrewPopoverCutComponent performCut', () => {
  let component: BrewPopoverCutComponent;

  beforeEach(() => {
    const modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    const translateSpy = jasmine.createSpyObj('TranslateService', ['instant']);
    const graphHelperSpy = jasmine.createSpyObj('GraphHelperService', [
      'initializeTraces',
      'fillTraces',
      'fillDataIntoTraces',
      'getChartLayout',
    ]);
    const settingsStorageSpy = jasmine.createSpyObj('UISettingsStorage', [
      'getSettings',
    ]);
    const cdrSpy = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);
    const ngZoneMock = {
      runOutsideAngular: (fn: () => void) => fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        BrewPopoverCutComponent,
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: TranslateService, useValue: translateSpy },
        { provide: GraphHelperService, useValue: graphHelperSpy },
        { provide: UISettingsStorage, useValue: settingsStorageSpy },
        { provide: ChangeDetectorRef, useValue: cdrSpy },
        { provide: NgZone, useValue: ngZoneMock },
      ],
    });

    component = TestBed.inject(BrewPopoverCutComponent);
  });

  it('should correctly filter and shift weights and timestamps', () => {
    // Arrange
    const rawFlow = new BrewFlow();
    rawFlow.weight = [
      {
        timestamp: '12:00:00.000',
        brew_time: '0.0',
        actual_weight: 0,
        old_weight: 0,
        actual_smoothed_weight: 0,
        old_smoothed_weight: 0,
        calculated_real_flow: 0,
        not_mutated_weight: 0,
      },
      {
        timestamp: '12:00:02.000',
        brew_time: '2.0',
        actual_weight: 5.0,
        old_weight: 0,
        actual_smoothed_weight: 5.0,
        old_smoothed_weight: 0,
        calculated_real_flow: 2.5,
        not_mutated_weight: 5.0,
      },
      {
        timestamp: '12:00:05.000',
        brew_time: '5.0',
        actual_weight: 15.0,
        old_weight: 5.0,
        actual_smoothed_weight: 15.0,
        old_smoothed_weight: 5.0,
        calculated_real_flow: 3.3,
        not_mutated_weight: 15.0,
      },
      {
        timestamp: '12:00:10.000',
        brew_time: '10.0',
        actual_weight: 35.0,
        old_weight: 15.0,
        actual_smoothed_weight: 35.0,
        old_smoothed_weight: 15.0,
        calculated_real_flow: 4.0,
        not_mutated_weight: 35.0,
      },
    ];

    // Act
    // Cut from 2.0 to 5.0 seconds
    const result = (component as any).performCut(rawFlow, 2.0, 5.0);

    // Assert
    expect(result.flowProfile.weight.length).toBe(2);

    // First remaining point (was at 2.0s) should be shifted to 0.0s
    expect(result.flowProfile.weight[0].brew_time).toBe('0.0');
    // Timestamp should be shifted by 2 seconds (2000 ms) back from 12:00:02.000 to 12:00:00.000
    expect(result.flowProfile.weight[0].timestamp).toBe('12:00:00.000');
    // Weight should remain the same absolute value (5.0g) - not tared
    expect(result.flowProfile.weight[0].actual_weight).toBe(5.0);

    // Second remaining point (was at 5.0s) should be shifted to 3.0s (5.0 - 2.0)
    expect(result.flowProfile.weight[1].brew_time).toBe('3.0');
    // Timestamp should be shifted by 2 seconds back from 12:00:05.000 to 12:00:03.000
    expect(result.flowProfile.weight[1].timestamp).toBe('12:00:03.000');
    // Weight should remain the same absolute value (15.0g) - not tared
    expect(result.flowProfile.weight[1].actual_weight).toBe(15.0);

    // Final weight should be 15.0g (the weight at the end of the range)
    expect(result.finalWeight).toBe(15.0);
  });

  it('should shift first drip time and blooming time when cutting from the left', () => {
    const rawFlow = new BrewFlow();
    rawFlow.weight = [
      {
        timestamp: '12:00:02.000',
        brew_time: '2.0',
        actual_weight: 5.0,
        old_weight: 0,
        actual_smoothed_weight: 5.0,
        old_smoothed_weight: 0,
        calculated_real_flow: 2.5,
        not_mutated_weight: 5.0,
      },
    ];

    const mockBrew = new Brew();
    mockBrew.coffee_first_drip_time = 5;
    mockBrew.coffee_first_drip_time_milliseconds = 500;
    mockBrew.coffee_blooming_time = 10;
    mockBrew.coffee_blooming_time_milliseconds = 200;

    // Cut starting at 2.0 seconds -> shift is 2.0s (2000 ms)
    const result = (component as any).performCut(rawFlow, 2.0, 10.0, mockBrew);

    // First drip time: 5500 ms - 2000 ms = 3500 ms -> 3s 500ms
    expect(result.coffee_first_drip_time).toBe(3);
    expect(result.coffee_first_drip_time_milliseconds).toBe(500);

    // Blooming time: 10200 ms - 2000 ms = 8200 ms -> 8s 200ms
    expect(result.coffee_blooming_time).toBe(8);
    expect(result.coffee_blooming_time_milliseconds).toBe(200);
  });

  it('should set first drip time and blooming time to zero if they fall below or equal to 0:00', () => {
    const rawFlow = new BrewFlow();
    rawFlow.weight = [
      {
        timestamp: '12:00:05.000',
        brew_time: '5.0',
        actual_weight: 5.0,
        old_weight: 0,
        actual_smoothed_weight: 5.0,
        old_smoothed_weight: 0,
        calculated_real_flow: 2.5,
        not_mutated_weight: 5.0,
      },
    ];

    const mockBrew = new Brew();
    mockBrew.coffee_first_drip_time = 4;
    mockBrew.coffee_first_drip_time_milliseconds = 0;
    mockBrew.coffee_blooming_time = 5;
    mockBrew.coffee_blooming_time_milliseconds = 0;

    // Cut starting at 5.0 seconds -> shift is 5.0s (5000 ms)
    const result = (component as any).performCut(rawFlow, 5.0, 10.0, mockBrew);

    // First drip time: 4000 ms - 5000 ms = -1000 ms <= 0 -> 0s 0ms
    expect(result.coffee_first_drip_time).toBe(0);
    expect(result.coffee_first_drip_time_milliseconds).toBe(0);

    // Blooming time: 5000 ms - 5000 ms = 0 ms <= 0 -> 0s 0ms
    expect(result.coffee_blooming_time).toBe(0);
    expect(result.coffee_blooming_time_milliseconds).toBe(0);
  });
});
