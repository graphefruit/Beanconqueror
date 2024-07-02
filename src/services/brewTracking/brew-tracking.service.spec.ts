import { TestBed } from '@angular/core/testing';

import { BrewTrackingService } from './brew-tracking.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { UIHelper } from '../uiHelper';
import { UIHelperMock } from '../../classes/mock';

describe('BrewTrackingService', () => {
  let service: BrewTrackingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
      ],
    });
    service = TestBed.inject(BrewTrackingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
