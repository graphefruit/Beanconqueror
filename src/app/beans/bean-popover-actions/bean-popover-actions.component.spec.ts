import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, NavParams } from '@ionic/angular';

import { BeanPopoverActionsComponent } from './bean-popover-actions.component';
import { UIHelper } from '../../../services/uiHelper';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { IBean } from '../../../interfaces/bean/iBean';
import { IonicStorageModule } from '@ionic/storage-angular';
import { TranslateModule } from '@ngx-translate/core';

describe('BeanPopoverActionsComponent', () => {
  let component: BeanPopoverActionsComponent;
  let fixture: ComponentFixture<BeanPopoverActionsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BeanPopoverActionsComponent],
      imports: [
        IonicModule.forRoot(),
        IonicStorageModule.forRoot(),
        TranslateModule.forRoot(),
        TranslateModule.forChild(),
      ],
      providers: [
        {
          provide: NavParams,
          useValue: {
            get(_param: string): any {
              return {
                bean_roast_information: {},
              } as IBean;
            },
          },
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
          provide: UIBeanHelper,
          useValue: {},
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BeanPopoverActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
