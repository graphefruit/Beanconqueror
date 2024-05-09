import { TestBed } from '@angular/core/testing';

import { IntentHandlerService } from './intent-handler.service';
import { UIHelper } from '../uiHelper';
import { UIHelperMock } from '../../classes/mock';
import { Deeplinks } from '@awesome-cordova-plugins/deeplinks/ngx';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { IonicModule } from '@ionic/angular';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';

describe('IntentHandlerService', () => {
  let service: IntentHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: UIHelper, useClass: UIHelperMock },
        { provide: Deeplinks },
        { provide: Storage },
      ],
      imports: [
        HttpClientTestingModule,
        IonicModule.forRoot(),
        TranslateModule.forRoot(),
      ],
    });
    service = TestBed.inject(IntentHandlerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
