import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavParams } from '@ionic/angular';

import { GreenBeanAddComponent } from './green-bean-add.component';
import {
  NavParamsMock,
  UIHelperMock,
  UIImageMock,
} from '../../../../classes/mock';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../../services/uiHelper';
import { UIImage } from '../../../../services/uiImage';

describe('GreenBeanAddComponent', () => {
  let component: GreenBeanAddComponent;
  let fixture: ComponentFixture<GreenBeanAddComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [GreenBeanAddComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), FormsModule],
      providers: [
        { provide: NavParams, useClass: NavParamsMock },
        { provide: Storage },
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
        {
          provide: UIImage,
          useClass: UIImageMock,
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GreenBeanAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
