import { TestBed } from '@angular/core/testing';

import { CoffeeBluetoothDevicesService } from './coffee-bluetooth-devices.service';

describe('CoffeeBluetoothDevicesService', () => {
  let service: CoffeeBluetoothDevicesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CoffeeBluetoothDevicesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
