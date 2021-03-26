import { TestBed } from '@angular/core/testing';

import { ServerCommunicationService } from './server-communication.service';

describe('ServerCommunicationService', () => {
  let service: ServerCommunicationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServerCommunicationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
