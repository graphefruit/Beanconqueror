import { TestBed } from '@angular/core/testing';

import { IosPlatformService } from './ios-platform.service';

describe('IosPlatformService', () => {
  let service: IosPlatformService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IosPlatformService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
