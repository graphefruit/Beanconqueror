import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewRatioCalculatorComponent } from './brew-ratio-calculator.component';

describe('BrewRatioCalculatorComponent', () => {
  let component: BrewRatioCalculatorComponent;
  let fixture: ComponentFixture<BrewRatioCalculatorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewRatioCalculatorComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(BrewRatioCalculatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
