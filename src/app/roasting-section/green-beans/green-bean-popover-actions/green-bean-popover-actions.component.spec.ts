import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, NavParams } from '@ionic/angular';

import { GreenBeanPopoverActionsComponent } from './green-bean-popover-actions.component';
import { NavParamsMock, UIHelperMock } from '../../../../classes/mock';
import { UIHelper } from '../../../../services/uiHelper';
import { TranslateModule } from '@ngx-translate/core';

describe('GreenBeanPopoverActionsComponent', () => {
  let component: GreenBeanPopoverActionsComponent;
  let fixture: ComponentFixture<GreenBeanPopoverActionsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [GreenBeanPopoverActionsComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: NavParams, useClass: NavParamsMock },
        { provide: UIHelper, useClass: UIHelperMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GreenBeanPopoverActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
