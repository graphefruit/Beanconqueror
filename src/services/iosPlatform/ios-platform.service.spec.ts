import { TestBed } from '@angular/core/testing';

import { IosPlatformService } from './ios-platform.service';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { IonicModule } from '@ionic/angular';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
import { FileTransfer } from '@awesome-cordova-plugins/file-transfer/ngx';
import { UIHelperMock } from '../../classes/mock';
import { UIHelper } from '../uiHelper';

describe('IosPlatformService', () => {
  let service: IosPlatformService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Storage },
        { provide: File },
        { provide: SocialSharing },
        { provide: FileTransfer },
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
      ],
      imports: [TranslateModule.forRoot(), IonicModule.forRoot()],
    });
    service = TestBed.inject(IosPlatformService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
