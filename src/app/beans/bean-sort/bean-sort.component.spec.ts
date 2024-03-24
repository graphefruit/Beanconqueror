import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, NavParams } from '@ionic/angular';

import { BeanSortComponent } from './bean-sort.component';
import { NavParamsMock, TranslateServiceMock } from '../../../classes/mock';
import { UIHelper } from '../../../services/uiHelper';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BEAN_SORT_ORDER } from '../../../enums/beans/beanSortOrder';
import { BEAN_SORT_AFTER } from '../../../enums/beans/beanSortAfter';

describe('BeanSortComponent', () => {
  let component: BeanSortComponent;
  let fixture: ComponentFixture<BeanSortComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BeanSortComponent, TranslatePipe],
      imports: [IonicModule.forRoot()],
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
        {
          provide: TranslateService,
          useValue: TranslateServiceMock,
        },
      ],
    }).compileComponents();
    NavParamsMock.setParams({
      sort_order: BEAN_SORT_ORDER.UNKOWN,
      sort_after: BEAN_SORT_AFTER.UNKOWN,
    });
    fixture = TestBed.createComponent(BeanSortComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
