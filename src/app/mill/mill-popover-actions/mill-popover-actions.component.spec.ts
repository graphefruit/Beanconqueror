import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, NavParams } from '@ionic/angular';

import { MillPopoverActionsComponent } from './mill-popover-actions.component';
import { NavParamsMock } from '../../../classes/mock';
import { UIHelper } from '../../../services/uiHelper';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelperMock } from '../../../classes/mock';

describe('MillPopoverActionsComponent', () => {
  let component: MillPopoverActionsComponent;
  let fixture: ComponentFixture<MillPopoverActionsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [MillPopoverActionsComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        {
          provide: NavParams,
          useClass: NavParamsMock,
        },
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MillPopoverActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
