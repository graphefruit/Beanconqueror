import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, NavParams } from '@ionic/angular';

import { PreparationAddTypeComponent } from './preparation-add-type.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../services/uiHelper';
import { NavParamsMock, UIHelperMock } from '../../../classes/mock';
import { FormsModule } from '@angular/forms';

describe('PreparationAddTypeComponent', () => {
  let component: PreparationAddTypeComponent;
  let fixture: ComponentFixture<PreparationAddTypeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PreparationAddTypeComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), FormsModule],
      providers: [
        { provide: Storage },
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
        {
          provide: NavParams,
          useClass: NavParamsMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PreparationAddTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
