import { TestBed } from '@angular/core/testing';

import { HapticService } from './haptic.service';

describe('HapticService', () => {
  let service: HapticService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HapticService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
