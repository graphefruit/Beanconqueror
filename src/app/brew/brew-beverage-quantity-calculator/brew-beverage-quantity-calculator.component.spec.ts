import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewBeverageQuantityCalculatorComponent } from './brew-beverage-quantity-calculator.component';

describe('BrewBeverageQuantityCalculatorComponent', () => {
  let component: BrewBeverageQuantityCalculatorComponent;
  let fixture: ComponentFixture<BrewBeverageQuantityCalculatorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ BrewBeverageQuantityCalculatorComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(BrewBeverageQuantityCalculatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
