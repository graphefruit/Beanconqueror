import { TestBed } from '@angular/core/testing';

import { QrScannerService } from './qr-scanner.service';

describe('QrScannerService', () => {
  let service: QrScannerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QrScannerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
