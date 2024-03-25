import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, NavParams } from '@ionic/angular';

import { RoastingMachinePopoverActionsComponent } from './roasting-machine-popover-actions.component';
import { NavParamsMock } from '../../../../classes/mock';
import { UIHelper } from '../../../../services/uiHelper';
import { TranslateModule } from '@ngx-translate/core';

describe('RoastingMachinePopoverActionsComponent', () => {
  let component: RoastingMachinePopoverActionsComponent;
  let fixture: ComponentFixture<RoastingMachinePopoverActionsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [RoastingMachinePopoverActionsComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        {
          provide: NavParams,
          useClass: NavParamsMock,
        },
        {
          provide: UIHelper,
          useValue: {
            copyData(_value: any): any {
              return _value;
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoastingMachinePopoverActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
