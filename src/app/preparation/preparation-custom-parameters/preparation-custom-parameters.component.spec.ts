import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {PreparationCustomParametersComponent} from './preparation-custom-parameters.component';

describe('PreparationCustomParametersComponent', () => {
  let component: PreparationCustomParametersComponent;
  let fixture: ComponentFixture<PreparationCustomParametersComponent>;

  beforeEach(async(() => {
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
