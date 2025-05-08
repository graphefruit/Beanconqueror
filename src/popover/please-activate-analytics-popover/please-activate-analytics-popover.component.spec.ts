import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PleaseActivateAnalyticsPopoverComponent } from './please-activate-analytics-popover.component';

describe('PleaseActivateAnalyticsPopoverComponent', () => {
  let component: PleaseActivateAnalyticsPopoverComponent;
  let fixture: ComponentFixture<PleaseActivateAnalyticsPopoverComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PleaseActivateAnalyticsPopoverComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(PleaseActivateAnalyticsPopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
