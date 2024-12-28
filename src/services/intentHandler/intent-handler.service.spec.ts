import { TestBed } from '@angular/core/testing';

import { IntentHandlerService } from './intent-handler.service';
import { UIHelper } from '../uiHelper';
import { UIHelperMock } from '../../classes/mock';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IonicModule } from '@ionic/angular';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';

describe('IntentHandlerService', () => {
  let service: IntentHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: UIHelper, useClass: UIHelperMock },
        { provide: Storage },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(IntentHandlerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
