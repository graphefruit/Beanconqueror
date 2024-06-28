import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BeanRoastInformationComponent } from './bean-roast-information.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../services/uiHelper';
import { UIHelperMock } from '../../../classes/mock';
import { FormsModule } from '@angular/forms';
import { Bean } from '../../../classes/bean/bean';

describe('BeanRoastInformationComponent', () => {
  let component: BeanRoastInformationComponent;
  let fixture: ComponentFixture<BeanRoastInformationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BeanRoastInformationComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), FormsModule],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BeanRoastInformationComponent);
    component = fixture.componentInstance;
    component.data = {
      bean_roast_information: {
        roast_length: 0,
      },
    } as Bean;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
