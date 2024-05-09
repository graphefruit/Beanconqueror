import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewRatioCalculatorComponent } from './brew-ratio-calculator.component';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../services/uiHelper';
import { UIHelperMock } from '../../../classes/mock';
import { Storage } from '@ionic/storage';

describe('BrewRatioCalculatorComponent', () => {
  let component: BrewRatioCalculatorComponent;
  let fixture: ComponentFixture<BrewRatioCalculatorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BrewRatioCalculatorComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: UIHelper, useClass: UIHelperMock },
        { provide: Storage },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BrewRatioCalculatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
