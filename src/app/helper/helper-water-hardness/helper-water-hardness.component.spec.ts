import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { HelperWaterHardnessComponent } from './helper-water-hardness.component';
import { TranslateModule } from '@ngx-translate/core';

describe('HelperWaterHardnessComponent', () => {
  let component: HelperWaterHardnessComponent;
  let fixture: ComponentFixture<HelperWaterHardnessComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [HelperWaterHardnessComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(HelperWaterHardnessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
