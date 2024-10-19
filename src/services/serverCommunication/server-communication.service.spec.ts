import { TestBed } from '@angular/core/testing';

import { ServerCommunicationService } from './server-communication.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';

describe('ServerCommunicationService', () => {
  let service: ServerCommunicationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ServerCommunicationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
