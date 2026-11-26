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
import { Announcer } from '../../../services/a11y/announcer.service';
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
  let announce: jasmine.Spy;

  beforeEach(() => {
    stopScan = jasmine.createSpy('stopScan').and.resolveTo();
    announce = jasmine.createSpy('announce');
    (window as unknown as { ble: unknown }).ble = {
      startScanWithOptions: jasmine.createSpy('startScanWithOptions'),
      withPromises: { stopScan },
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ChangeDetectorRef, useValue: {} },
        { provide: ModalController, useValue: {} },
        { provide: Platform, useValue: { is: () => false } },
        {
          provide: UIAlert,
          useValue: { showMessage: jasmine.createSpy().and.resolveTo() },
        },
        { provide: Announcer, useValue: { announce } },
        { provide: UIAnalytics, useValue: {} },
        { provide: UIHelper, useValue: {} },
        { provide: UIToast, useValue: {} },
        {
          provide: TranslateService,
          useValue: { instant: (key: string) => `text of ${key}` },
        },
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

  describe('hint why no device is found', () => {
    const PERMISSION_MISSING =
      'BLUETOOTH_DEVICE_CHOOSER_HINT.PERMISSION_MISSING';

    const cases: {
      name: string;
      location: [has: boolean, request?: boolean];
      bluetooth: [has: boolean, request?: boolean];
      enabled: boolean;
      hint: string | undefined;
    }[] = [
      {
        name: 'none when everything is allowed and on',
        location: [true],
        bluetooth: [true],
        enabled: true,
        hint: undefined,
      },
      {
        name: 'none when the user allows what was asked',
        location: [false, true],
        bluetooth: [false, true],
        enabled: true,
        hint: undefined,
      },
      {
        name: 'the permission when the location is denied',
        location: [false, false],
        bluetooth: [true],
        enabled: true,
        hint: PERMISSION_MISSING,
      },
      {
        name: 'the permission when Bluetooth is denied',
        location: [true],
        bluetooth: [false, false],
        enabled: true,
        hint: PERMISSION_MISSING,
      },
      {
        name: 'the permission before Bluetooth being off',
        location: [true],
        bluetooth: [false, false],
        enabled: false,
        hint: PERMISSION_MISSING,
      },
      {
        name: 'Bluetooth being off',
        location: [true],
        bluetooth: [true],
        enabled: false,
        hint: 'BLUETOOTH_DEVICE_CHOOSER_HINT.BLUETOOTH_OFF',
      },
    ];

    for (const { name, location, bluetooth, enabled, hint } of cases) {
      it(`is ${name}`, fakeAsync(() => {
        (bleManager.hasLocationPermission as jasmine.Spy).and.resolveTo(
          location[0],
        );
        spyOn(bleManager, 'requestLocationPermissions').and.resolveTo(
          location[1],
        );
        (bleManager.hasBluetoothPermission as jasmine.Spy).and.resolveTo(
          bluetooth[0],
        );
        spyOn(bleManager, 'requestBluetoothPermissions').and.resolveTo(
          bluetooth[1],
        );
        (bleManager.isBleEnabled as jasmine.Spy).and.resolveTo(enabled);

        const chooser = openChooser();

        expect(chooser.searchHint).toBe(hint);
        if (hint) {
          expect(announce).toHaveBeenCalledWith(`text of ${hint}`);
        } else {
          expect(announce).not.toHaveBeenCalled();
        }
        chooser.ngOnDestroy();
        flushMicrotasks();
      }));
    }

    it('stays until a search again finds everything allowed', fakeAsync(() => {
      (bleManager.hasLocationPermission as jasmine.Spy).and.resolveTo(false);
      spyOn(bleManager, 'requestLocationPermissions').and.resolveTo(false);
      const chooser = openChooser();
      expect(chooser.searchHint).toBe(PERMISSION_MISSING);

      (bleManager.hasLocationPermission as jasmine.Spy).and.resolveTo(true);
      chooser.research();
      flushMicrotasks();

      expect(chooser.searchHint).toBeUndefined();
      chooser.ngOnDestroy();
      flushMicrotasks();
    }));
  });

  describe('no devices found', () => {
    const NO_DEVICES = 'text of NO_DEVICES_FOUND_PLEASE_TRY_AGAIN';

    it('is announced when the search ends without a device', fakeAsync(() => {
      const chooser = openChooser();
      tick(SCAN_TIMEOUT);

      expect(chooser.searchRunning).toBeFalse();
      expect(announce).toHaveBeenCalledOnceWith(NO_DEVICES);
      chooser.ngOnDestroy();
      flushMicrotasks();
    }));

    it('is not announced when the search ends with a device', fakeAsync(() => {
      const chooser = openChooser();
      chooser.foundDevices = [{ id: 'aa', type: 'LUNAR' }];
      tick(SCAN_TIMEOUT);

      expect(announce).not.toHaveBeenCalled();
      chooser.ngOnDestroy();
      flushMicrotasks();
    }));

    it('is not announced when the chooser closes or searches again', fakeAsync(() => {
      const chooser = openChooser();
      chooser.research();
      flushMicrotasks();
      chooser.ngOnDestroy();
      flushMicrotasks();
      tick(SCAN_TIMEOUT);

      expect(announce).not.toHaveBeenCalled();
    }));
  });
});
