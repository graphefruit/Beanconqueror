import { TestBed } from '@angular/core/testing';

import { QueueServiceService } from './queue-service.service';

describe('QueueServiceService', () => {
  let service: QueueServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QueueServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
