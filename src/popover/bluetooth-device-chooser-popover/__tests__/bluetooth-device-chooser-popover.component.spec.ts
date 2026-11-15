import { ChangeDetectorRef } from '@angular/core';
import {
  fakeAsync,
  flushMicrotasks,
  TestBed,
  tick,
} from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular';

import { TranslateService } from '@ngx-translate/core';

import { BluetoothTypes } from '../../../classes/devices';
import { CoffeeBluetoothDevicesService } from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIHelper } from '../../../services/uiHelper';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIToast } from '../../../services/uiToast';
import { BluetoothDeviceChooserPopoverComponent } from '../bluetooth-device-chooser-popover.component';

describe('BluetoothDeviceChooserPopoverComponent', () => {
  const SCAN_TIMEOUT = 60_000;
  let stopScan: jasmine.Spy;
  let bleManager: CoffeeBluetoothDevicesService;

  beforeEach(() => {
    stopScan = jasmine.createSpy('stopScan').and.resolveTo();
    (window as unknown as { ble: unknown }).ble = {
      startScanWithOptions: jasmine.createSpy('startScanWithOptions'),
      withPromises: { stopScan },
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ChangeDetectorRef, useValue: {} },
        { provide: ModalController, useValue: {} },
        { provide: Platform, useValue: { is: () => false } },
        { provide: UIAlert, useValue: {} },
        { provide: UIAnalytics, useValue: {} },
        { provide: UIHelper, useValue: {} },
        { provide: UIToast, useValue: {} },
        { provide: TranslateService, useValue: {} },
        { provide: UIPreparationStorage, useValue: {} },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => ({ scale_id: '' }) },
        },
      ],
    });
    bleManager = TestBed.inject(CoffeeBluetoothDevicesService);
    spyOn(bleManager, 'hasLocationPermission').and.resolveTo(true);
    spyOn(bleManager, 'hasBluetoothPermission').and.resolveTo(true);
    spyOn(bleManager, 'isBleEnabled').and.resolveTo(true);
  });

  afterEach(() => {
    delete (window as unknown as { ble?: unknown }).ble;
  });

  function openChooser(): BluetoothDeviceChooserPopoverComponent {
    const chooser = TestBed.runInInjectionContext(
      () => new BluetoothDeviceChooserPopoverComponent(),
    );
    chooser.bluetoothTypeSearch = BluetoothTypes.SCALE;
    chooser.ngOnInit();
    flushMicrotasks();
    return chooser;
  }

  it('keeps the search of a reopened chooser running when the closed one times out', fakeAsync(() => {
    const closed = openChooser();
    tick(SCAN_TIMEOUT / 2);
    closed.ngOnDestroy();
    flushMicrotasks();

    const reopened = openChooser();
    const stopsBefore = stopScan.calls.count();
    tick(SCAN_TIMEOUT - 1);

    expect(stopScan.calls.count()).toBe(stopsBefore);
    expect(reopened.searchRunning).toBeTrue();

    tick(1);
    expect(stopScan.calls.count()).toBe(stopsBefore + 1);
    expect(reopened.searchRunning).toBeFalse();
    reopened.ngOnDestroy();
    flushMicrotasks();
  }));

  it('leaves no search timer behind when it is closed', fakeAsync(() => {
    const chooser = openChooser();
    chooser.ngOnDestroy();
    flushMicrotasks();
    const stopsAfterClose = stopScan.calls.count();

    tick(SCAN_TIMEOUT);

    expect(stopScan.calls.count()).toBe(stopsAfterClose);
  }));

  it('lets the start scan finish when the chooser closes during it', fakeAsync(() => {
    const chooser = openChooser();
    let found: boolean | undefined;
    void bleManager
      .findDeviceWithDirectIds(['aa'], 8000)
      .then((result) => (found = result));
    tick(1000);

    chooser.ngOnDestroy();
    tick(SCAN_TIMEOUT + 10_000);

    expect(found).toBeFalse();
  }));
});
