import { TestBed } from '@angular/core/testing';

import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { ScaleType } from '../../classes/devices';
import { Logger } from '../../classes/devices/common/logger';
import { BluetoothTypes } from '../../classes/devices/types';
import { UIAnalytics } from '../uiAnalytics';
import { UIHelper } from '../uiHelper';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIToast } from '../uiToast';
import { CoffeeBluetoothDevicesService } from './coffee-bluetooth-devices.service';

const DEVICE_ID = 'FE03A2F4-1B2C-4D5E-8F90-A1B2C3D4E5F6';
const DEVICE_NAME = 'LUNAR-0A1B2C';

interface BleStub {
  startScanWithOptions: jasmine.Spy;
  stopScan: jasmine.Spy;
  connect: jasmine.Spy;
}

describe('CoffeeBluetoothDevicesService logging', () => {
  const globalScope = window as unknown as { ble?: BleStub };
  let service: CoffeeBluetoothDevicesService;
  let logs: string[];
  let subscription: Subscription;

  beforeEach(() => {
    globalScope.ble = {
      startScanWithOptions: jasmine
        .createSpy('startScanWithOptions')
        .and.callFake(
          (
            _services: string[],
            _options: unknown,
            found: (device: unknown) => void,
          ) => found({ id: DEVICE_ID, name: DEVICE_NAME, rssi: -50 }),
        ),
      stopScan: jasmine.createSpy('stopScan'),
      connect: jasmine.createSpy('connect'),
    };
    logs = [];
    subscription = Logger.attachOnLog().subscribe((entry) =>
      logs.push(entry.log),
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        CoffeeBluetoothDevicesService,
        { provide: UISettingsStorage, useValue: { getSettings: () => ({}) } },
        { provide: TranslateService, useValue: { instant: (k: string) => k } },
        { provide: UIToast, useValue: {} },
        { provide: UIHelper, useValue: {} },
        { provide: UIAnalytics, useValue: {} },
      ],
    });
    service = TestBed.inject(CoffeeBluetoothDevicesService);
  });

  afterEach(() => {
    subscription.unsubscribe();
    delete globalScope.ble;
  });

  function expectNoDeviceIdentity() {
    expect(logs.length).toBeGreaterThan(0);
    for (const log of logs) {
      expect(log).not.toContain(DEVICE_ID);
      expect(log).not.toContain(DEVICE_NAME);
    }
  }

  it('logs no id or name of devices found while scanning', () => {
    const found: { id: string; type: string }[] = [];
    const scan = service
      .scanForDevicesAndReport(BluetoothTypes.SCALE)
      .subscribe((device) => found.push(device));
    scan.unsubscribe();

    expect(found).toEqual([
      jasmine.objectContaining({ id: DEVICE_ID, type: ScaleType.LUNAR }),
    ]);
    expectNoDeviceIdentity();
  });

  it('logs no device id when connecting to a saved scale', async () => {
    await service.autoConnectScale(ScaleType.LUNAR, DEVICE_ID, false);

    expect(globalScope.ble.connect).toHaveBeenCalledWith(
      DEVICE_ID,
      jasmine.any(Function),
      jasmine.any(Function),
    );
    expectNoDeviceIdentity();
  });
});
