import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, NavParams } from '@ionic/angular';

import { RoastingMachineEditComponent } from './roasting-machine-edit.component';
import { NavParamsMock, UIHelperMock } from '../../../../classes/mock';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../../services/uiHelper';
import { FormsModule } from '@angular/forms';

describe('RoastingMachineEditComponent', () => {
  let component: RoastingMachineEditComponent;
  let fixture: ComponentFixture<RoastingMachineEditComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RoastingMachineEditComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), FormsModule],
      providers: [
        {
          provide: NavParams,
          useClass: NavParamsMock,
        },
        {
          provide: Storage,
        },
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoastingMachineEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
