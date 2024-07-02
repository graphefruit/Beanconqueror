import { TestBed } from '@angular/core/testing';

import { AndroidPlatformService } from './android-platform.service';
import { Storage } from '@ionic/storage';
import { TranslateService } from '@ngx-translate/core';
import { TranslateServiceMock, UIHelperMock } from '../../classes/mock';
import { IonicModule } from '@ionic/angular';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
import { FileTransfer } from '@awesome-cordova-plugins/file-transfer/ngx';
import { UIHelper } from '../uiHelper';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';

describe('AndroidPlatformService', () => {
  let service: AndroidPlatformService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule],
      providers: [
        {
          provide: Storage,
        },
        {
          provide: TranslateService,
          useValue: TranslateServiceMock,
        },
        {
          provide: File,
        },
        {
          provide: SocialSharing,
        },
        {
          provide: FileTransfer,
        },
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
        {
          provide: AndroidPermissions,
        },
      ],
    });
    service = TestBed.inject(AndroidPlatformService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
