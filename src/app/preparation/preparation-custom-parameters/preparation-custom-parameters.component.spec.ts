import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavParams } from '@ionic/angular';

import { PreparationCustomParametersComponent } from './preparation-custom-parameters.component';
import { NavParamsMock, UIHelperMock } from '../../../classes/mock';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../services/uiHelper';

describe('PreparationCustomParametersComponent', () => {
  let component: PreparationCustomParametersComponent;
  let fixture: ComponentFixture<PreparationCustomParametersComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PreparationCustomParametersComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), FormsModule],
      providers: [
        { provide: NavParams, useClass: NavParamsMock },
        { provide: Storage },
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PreparationCustomParametersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
