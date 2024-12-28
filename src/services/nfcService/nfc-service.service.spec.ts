import { TestBed } from '@angular/core/testing';

import { NfcServiceService } from './nfc-service.service';

describe('NfcServiceService', () => {
  let service: NfcServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NfcServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
