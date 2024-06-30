import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewRatioCardComponent } from './brew-ratio-card.component';
import { TranslateModule } from '@ngx-translate/core';

describe('BrewRatioCardComponent', () => {
  let component: BrewRatioCardComponent;
  let fixture: ComponentFixture<BrewRatioCardComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewRatioCardComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(BrewRatioCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
