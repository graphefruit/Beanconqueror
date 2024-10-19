import { TestBed } from '@angular/core/testing';

import { BeanSortFilterHelperService } from './bean-sort-filter-helper.service';

describe('BeanSortFilterHelperService', () => {
  let service: BeanSortFilterHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BeanSortFilterHelperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
