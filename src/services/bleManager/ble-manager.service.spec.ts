import { TestBed } from '@angular/core/testing';

import { BleManagerService } from './ble-manager.service';

describe('BleManagerService', () => {
  let service: BleManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BleManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
