import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, NavParams } from '@ionic/angular';

import { MillDetailComponent } from './mill-detail.component';
import { UIHelper } from '../../../services/uiHelper';
import { NavParamsMock, UIHelperMock } from '../../../classes/mock';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { TranslateModule } from '@ngx-translate/core';

describe('MillDetailComponent', () => {
  let component: MillDetailComponent;
  let fixture: ComponentFixture<MillDetailComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [MillDetailComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
        {
          provide: NavParams,
          useClass: NavParamsMock,
        },
        {
          provide: UIAnalytics,
          useValue: {},
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MillDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
