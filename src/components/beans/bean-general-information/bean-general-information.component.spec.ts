import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BeanGeneralInformationComponent } from './bean-general-information.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../services/uiHelper';
import { UIHelperMock } from '../../../classes/mock';
import { Bean } from '../../../classes/bean/bean';
import { FormsModule } from '@angular/forms';
import { KeysPipe } from '../../../pipes/keys';
import { Config } from '../../../classes/objectConfig/objectConfig';

describe('BeanGeneralInformationComponent', () => {
  let component: BeanGeneralInformationComponent;
  let fixture: ComponentFixture<BeanGeneralInformationComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BeanGeneralInformationComponent, KeysPipe],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), FormsModule],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BeanGeneralInformationComponent);
    component = fixture.componentInstance;
    component.data = {
      name: '',
      config: {
        uuid: '',
      } as Config,
    } as Bean;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
