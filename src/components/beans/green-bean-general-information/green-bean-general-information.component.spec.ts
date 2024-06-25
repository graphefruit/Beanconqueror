import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { GreenBeanGeneralInformationComponent } from './green-bean-general-information.component';
import { TranslateModule } from '@ngx-translate/core';
import { Storage } from '@ionic/storage';
import { UIHelper } from '../../../services/uiHelper';
import { UIHelperMock } from '../../../classes/mock';
import { FormsModule } from '@angular/forms';
import { GreenBean } from '../../../classes/green-bean/green-bean';

describe('GreenBeanGeneralInformationComponent', () => {
  let component: GreenBeanGeneralInformationComponent;
  let fixture: ComponentFixture<GreenBeanGeneralInformationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [GreenBeanGeneralInformationComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), FormsModule],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GreenBeanGeneralInformationComponent);
    component = fixture.componentInstance;
    component.data = {
      name: '',
      config: {
        uuid: '',
      },
    } as GreenBean;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
