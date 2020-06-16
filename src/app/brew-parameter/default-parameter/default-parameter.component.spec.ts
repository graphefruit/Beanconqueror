import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {DefaultParameterComponent} from './default-parameter.component';

describe('DefaultParameterComponent', () => {
  let component: DefaultParameterComponent;
  let fixture: ComponentFixture<DefaultParameterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DefaultParameterComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(DefaultParameterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
