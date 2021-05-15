import { TestBed } from '@angular/core/testing';

import { IntentHandlerService } from './intent-handler.service';

describe('IntentHandlerService', () => {
  let service: IntentHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IntentHandlerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
