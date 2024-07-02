import { TestBed } from '@angular/core/testing';

import { VisualizerService } from './visualizer-service.service';
import { UIFileHelper } from '../uiFileHelper';
import { UIToast } from '../uiToast';
import { UIBrewStorage } from '../uiBrewStorage';
import { UISettingsStorage } from '../uiSettingsStorage';

describe('VisualizerService', () => {
  let service: VisualizerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UIFileHelper,
          useValue: {},
        },
        {
          provide: UIToast,
          useValue: {},
        },
        {
          provide: UIBrewStorage,
          useValue: {},
        },
        {
          provide: UISettingsStorage,
          useValue: {},
        },
      ],
    });
    service = TestBed.inject(VisualizerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
