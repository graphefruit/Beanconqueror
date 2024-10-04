import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PhotoAddComponent } from './photo-add.component';
import { UIImage } from '../../services/uiImage';
import { UIImageMock } from '../../classes/mock';
import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
import { FileTransfer } from '@awesome-cordova-plugins/file-transfer/ngx';
import { TranslateModule } from '@ngx-translate/core';

describe('PhotoAddComponent', () => {
  let component: PhotoAddComponent;
  let fixture: ComponentFixture<PhotoAddComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PhotoAddComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        {
          provide: UIImage,
          useClass: UIImageMock,
        },
        { provide: SocialSharing },
        { provide: FileTransfer },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
