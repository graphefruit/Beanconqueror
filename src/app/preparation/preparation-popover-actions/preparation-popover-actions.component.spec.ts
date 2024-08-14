import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, NavParams } from '@ionic/angular';

import { PreparationPopoverActionsComponent } from './preparation-popover-actions.component';
import { NavParamsMock, UIHelperMock } from '../../../classes/mock';
import { UIHelper } from '../../../services/uiHelper';
import { TranslateModule } from '@ngx-translate/core';
import { IPreparation } from '../../../interfaces/preparation/iPreparation';

describe('PreparationPopoverActionsComponent', () => {
  let component: PreparationPopoverActionsComponent;
  let fixture: ComponentFixture<PreparationPopoverActionsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PreparationPopoverActionsComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: NavParams, useClass: NavParamsMock },
        { provide: UIHelper, useClass: UIHelperMock },
      ],
    }).compileComponents();

    NavParamsMock.setParams({
      brew_order: {
        after: {},
        before: {},
        while: {},
      },
    } as IPreparation);

    fixture = TestBed.createComponent(PreparationPopoverActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
