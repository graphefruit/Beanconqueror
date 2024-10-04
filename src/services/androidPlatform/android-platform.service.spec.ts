import { TestBed } from '@angular/core/testing';

import { AndroidPlatformService } from './android-platform.service';
import { Storage } from '@ionic/storage';
import { TranslateService } from '@ngx-translate/core';
import { TranslateServiceMock, UIHelperMock } from '../../classes/mock';
import { IonicModule } from '@ionic/angular';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
import { UIHelper } from '../uiHelper';

describe('AndroidPlatformService', () => {
  let service: AndroidPlatformService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule],
      providers: [
        {
          provide: AndroidPermissions,
        },
        {
          provide: Storage,
        },
        {
          provide: TranslateService,
          useValue: TranslateServiceMock,
        },
        {
          provide: SocialSharing,
        },
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
      ],
    });
    service = TestBed.inject(AndroidPlatformService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
