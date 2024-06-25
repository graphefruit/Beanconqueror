import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { GreenBeanInformationComponent } from './green-bean-information.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../services/uiHelper';
import { UIHelperMock, UIImageMock } from '../../classes/mock';
import { UIImage } from '../../services/uiImage';
import { GreenBean } from '../../classes/green-bean/green-bean';
import { Config } from '../../classes/objectConfig/objectConfig';

describe('GreenBeanInformationComponent', () => {
  let component: GreenBeanInformationComponent;
  let fixture: ComponentFixture<GreenBeanInformationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [GreenBeanInformationComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
        {
          provide: UIImage,
          useClass: UIImageMock,
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GreenBeanInformationComponent);
    component = fixture.componentInstance;
    component.greenBean = {
      name: '',
      attachments: new Array<string>(),
      config: {
        uuid: '',
      } as Config,
      beanAgeInDays(): number {
        return 0;
      },
    } as GreenBean;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
