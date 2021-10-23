import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {PreparationCustomParametersComponent} from './preparation-custom-parameters.component';

describe('PreparationCustomParametersComponent', () => {
  let component: PreparationCustomParametersComponent;
  let fixture: ComponentFixture<PreparationCustomParametersComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PreparationCustomParametersComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(PreparationCustomParametersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
