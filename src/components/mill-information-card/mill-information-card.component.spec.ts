import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { MillInformationCardComponent } from './mill-information-card.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../services/uiHelper';
import { UIHelperMock, UIImageMock } from '../../classes/mock';
import { UIImage } from '../../services/uiImage';
import { Config } from '../../classes/objectConfig/objectConfig';
import { Preparation } from '../../classes/preparation/preparation';

describe('MillInformationCardComponent', () => {
  let component: MillInformationCardComponent;
  let fixture: ComponentFixture<MillInformationCardComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [MillInformationCardComponent],
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
    fixture = TestBed.createComponent(MillInformationCardComponent);
    component = fixture.componentInstance;
    component.mill = {
      config: {
        uuid: '',
      } as Config,
      hasPhotos(): boolean {
        return false;
      },
    } as Preparation;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
