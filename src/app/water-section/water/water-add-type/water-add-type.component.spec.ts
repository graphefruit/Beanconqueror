import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, NavParams } from '@ionic/angular';

import { WaterAddTypeComponent } from './water-add-type.component';
import { Storage } from '@ionic/storage';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  NavParamsMock,
  TranslateServiceMock,
  UIHelperMock,
} from 'src/classes/mock';
import { UIHelper } from 'src/services/uiHelper';
import { FormsModule } from '@angular/forms';

describe('WaterAddTypeComponent', () => {
  let component: WaterAddTypeComponent;
  let fixture: ComponentFixture<WaterAddTypeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WaterAddTypeComponent],
      imports: [IonicModule.forRoot(), FormsModule, TranslateModule],
      providers: [
        { provide: NavParams, useClass: NavParamsMock },
        { provide: Storage },
        { provide: TranslateService, useValue: TranslateServiceMock },
        { provide: UIHelper, useClass: UIHelperMock },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WaterAddTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
