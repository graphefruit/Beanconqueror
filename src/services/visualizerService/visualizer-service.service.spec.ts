import { TestBed } from '@angular/core/testing';

import { VisualizerServiceService } from './visualizer-service.service';

describe('VisualizerServiceService', () => {
  let service: VisualizerServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VisualizerServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
