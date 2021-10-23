import { TestBed } from '@angular/core/testing';

import { BrewTrackingService } from './brew-tracking.service';

describe('BrewTrackingService', () => {
  let service: BrewTrackingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BrewTrackingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
