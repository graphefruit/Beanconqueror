import { TestBed } from '@angular/core/testing';

import { AndroidPlatformService } from './android-platform.service';

describe('AndroidPlatformService', () => {
  let service: AndroidPlatformService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AndroidPlatformService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
