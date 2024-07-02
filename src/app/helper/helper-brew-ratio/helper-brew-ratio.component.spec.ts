import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { HelperBrewRatioComponent } from './helper-brew-ratio.component';
import { TranslateModule } from '@ngx-translate/core';

describe('HelperBrewRatioComponent', () => {
  let component: HelperBrewRatioComponent;
  let fixture: ComponentFixture<HelperBrewRatioComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [HelperBrewRatioComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(HelperBrewRatioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
