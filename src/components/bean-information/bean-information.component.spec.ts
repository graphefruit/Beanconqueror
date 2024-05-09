import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BeanInformationComponent } from './bean-information.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../services/uiHelper';
import { UIHelperMock, UIImageMock } from '../../classes/mock';
import { UIImage } from '../../services/uiImage';
import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Bean } from '../../classes/bean/bean';

describe('BeanInformationComponent', () => {
  let component: BeanInformationComponent;
  let fixture: ComponentFixture<BeanInformationComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BeanInformationComponent],
      imports: [
        IonicModule.forRoot(),
        TranslateModule.forRoot(),
        HttpClientTestingModule,
      ],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
        {
          provide: UIImage,
          useClass: UIImageMock,
        },
        { provide: SocialSharing },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BeanInformationComponent);
    component = fixture.componentInstance;
    component.bean = new Bean();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
