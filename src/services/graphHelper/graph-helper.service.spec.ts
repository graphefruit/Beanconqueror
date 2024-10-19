import { TestBed } from '@angular/core/testing';

import { GraphHelperService } from './graph-helper.service';

describe('GraphHelperService', () => {
  let service: GraphHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GraphHelperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
