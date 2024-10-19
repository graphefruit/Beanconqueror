import { TestBed } from '@angular/core/testing';

import { ShareService } from './share-service.service';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../uiHelper';
import { UIHelperMock } from '../../classes/mock';
import { Storage } from '@ionic/storage';
import { IonicModule, ModalController } from '@ionic/angular';

describe('ShareService', () => {
  let service: ShareService;

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
        {
          provide: ModalController,
        },
      ],
      imports: [TranslateModule.forRoot(), IonicModule.forRoot()],
    });
    service = TestBed.inject(ShareService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
