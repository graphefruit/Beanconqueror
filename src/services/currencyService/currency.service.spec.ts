import { TestBed } from '@angular/core/testing';

import { CurrencyService } from './currency.service';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { UIHelper } from '../uiHelper';
import { UIHelperMock } from '../../classes/mock';

describe('CurrencyService', () => {
  let service: CurrencyService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Storage },
        { provide: ModalController },
        { provide: UIHelper, useClass: UIHelperMock },
      ],
      imports: [TranslateModule.forRoot(), IonicModule.forRoot()],
    });
    service = TestBed.inject(CurrencyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
