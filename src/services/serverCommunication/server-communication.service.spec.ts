import { TestBed } from '@angular/core/testing';

import { ServerCommunicationService } from './server-communication.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ServerCommunicationService', () => {
  let service: ServerCommunicationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(ServerCommunicationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
