import { TestBed } from '@angular/core/testing';

import { CleanupService } from './cleanup.service';
import { UIHelper } from '../uiHelper';
import { UIHelperMock } from '../../classes/mock';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { IonicModule } from '@ionic/angular';

describe('CleanupService', () => {
  let service: CleanupService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
        {
          provide: Storage,
        },
      ],
      imports: [TranslateModule.forRoot(), IonicModule.forRoot()],
    });
    service = TestBed.inject(CleanupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
