import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {DefaultCustomParameterComponent} from './default-custom-parameter.component';

describe('DefaultCustomParameterComponent', () => {
  let component: DefaultCustomParameterComponent;
  let fixture: ComponentFixture<DefaultCustomParameterComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ DefaultCustomParameterComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(DefaultCustomParameterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
