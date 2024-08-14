import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { WaterPopoverActionsComponent } from './water-popover-actions.component';
import { TranslateModule } from '@ngx-translate/core';

describe('WaterPopoverActionsComponent', () => {
  let component: WaterPopoverActionsComponent;
  let fixture: ComponentFixture<WaterPopoverActionsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WaterPopoverActionsComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(WaterPopoverActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
