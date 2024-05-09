import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewBrixCalculatorComponent } from './brew-brix-calculator.component';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../services/uiHelper';
import { UIHelperMock } from '../../../classes/mock';
import { Storage } from '@ionic/storage';

describe('BrewBrixCalculatorComponent', () => {
  let component: BrewBrixCalculatorComponent;
  let fixture: ComponentFixture<BrewBrixCalculatorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BrewBrixCalculatorComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
        {
          provide: Storage,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BrewBrixCalculatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
