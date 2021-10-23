import { TestBed } from '@angular/core/testing';

import { CleanupService } from './cleanup.service';

describe('CleanupService', () => {
  let service: CleanupService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CleanupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
