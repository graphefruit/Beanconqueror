import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, NavParams } from '@ionic/angular';

import { GreenBeanSortComponent } from './green-bean-sort.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../../services/uiHelper';
import { NavParamsMock, UIHelperMock } from '../../../../classes/mock';
import { BEAN_SORT_ORDER } from '../../../../enums/beans/beanSortOrder';
import { IBeanPageSort } from '../../../../interfaces/bean/iBeanPageSort';

describe('GreenBeanSortComponent', () => {
  let component: GreenBeanSortComponent;
  let fixture: ComponentFixture<GreenBeanSortComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [GreenBeanSortComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
        {
          provide: NavParams,
          useClass: NavParamsMock,
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    NavParamsMock.setParams({
      sort_order: BEAN_SORT_ORDER.ASCENDING,
    } as IBeanPageSort);
    fixture = TestBed.createComponent(GreenBeanSortComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
