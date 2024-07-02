import { TestBed } from '@angular/core/testing';

import { QrScannerService } from './qr-scanner.service';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../uiHelper';
import { UIHelperMock } from '../../classes/mock';
import { Storage } from '@ionic/storage';
import { IonicModule } from '@ionic/angular';

describe('QrScannerService', () => {
  let service: QrScannerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), IonicModule.forRoot()],
      providers: [
        { provide: UIHelper, useClass: UIHelperMock },
        { provide: Storage },
      ],
    });
    service = TestBed.inject(QrScannerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
