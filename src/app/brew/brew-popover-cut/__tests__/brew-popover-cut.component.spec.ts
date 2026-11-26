import { ChangeDetectorRef, NgZone } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { TranslateService } from '@ngx-translate/core';

import { Brew } from 'src/classes/brew/brew';
import { MeticulousDevice } from '../../../../classes/preparationDevice/meticulous/meticulousDevice';
import { GraphHelperService } from '../../../../services/graphHelper/graph-helper.service';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { BrewPopoverCutComponent } from '../brew-popover-cut.component';

describe('BrewPopoverCutComponent', () => {
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

  it('offers the whole profile, previews the weight and saves the cut', fakeAsync(() => {
    const flow = MeticulousDevice.returnBrewFlowForShotData(
      [100, 1350, 30125].map((time, index) => ({
        time,
        shot: { weight: index * 12, pressure: 9, gravimetric_flow: 2 },
      })),
    );
    for (const samples of [flow.weight, flow.pressureFlow, flow.realtimeFlow]) {
      samples.forEach((sample) => {
        sample.brew_time = '';
      });
    }
    component.flowProfile = flow;
    component.brew = new Brew();
    component.ngOnInit();
    tick(50);

    expect(component.maxTime).toBe(30.025);
    expect(component.cutRange).toEqual({ lower: 0, upper: 30.025 });
    expect(component.newFinalWeight).toBe(24);
    expect(component.isSaveDisabled()).toBeTrue();
    component.onRangeInput({ detail: { value: { lower: 1.25, upper: 2 } } });
    expect(component.newFinalWeight).toBe(12);
    expect(component.isSaveDisabled()).toBeFalse();

    component.save();

    const modalController = TestBed.inject(
      ModalController,
    ) as jasmine.SpyObj<ModalController>;
    const [cut, role, id] = modalController.dismiss.calls.mostRecent().args;
    expect(role).toBe('save');
    expect(id).toBe(BrewPopoverCutComponent.COMPONENT_ID);
    expect(cut.flowProfile.weight.length).toBe(1);
    expect(cut.finalWeight).toBe(12);
    expect(cut.brew_time).toBe(1);
    expect(cut.brew_time_milliseconds).toBe(750);
  }));
});
