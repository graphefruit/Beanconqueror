import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { AnalyticsPopoverComponent } from './analytics-popover.component';
import {
  TranslateModule,
  TranslatePipe,
  TranslateService,
} from '@ngx-translate/core';
import { TranslateServiceMock, UIHelperMock } from '../../classes/mock';
import { UIHelper } from '../../services/uiHelper';
import { Storage } from '@ionic/storage';

describe('AnalyticsPopoverComponent', () => {
  let component: AnalyticsPopoverComponent;
  let fixture: ComponentFixture<AnalyticsPopoverComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AnalyticsPopoverComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        {
          provide: UIHelper,
          useValue: UIHelperMock,
        },
        {
          provide: Storage,
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AnalyticsPopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
