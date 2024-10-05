import { TestBed } from '@angular/core/testing';

import { BrewTrackingService } from './brew-tracking.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { UIHelper } from '../uiHelper';
import { UIHelperMock } from '../../classes/mock';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('BrewTrackingService', () => {
  let service: BrewTrackingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [],
    providers: [
        {
            provide: UIHelper,
            useClass: UIHelperMock,
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
});
    service = TestBed.inject(BrewTrackingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
