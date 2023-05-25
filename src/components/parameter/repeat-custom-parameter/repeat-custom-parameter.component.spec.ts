import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { RepeatCustomParameterComponent } from './repeat-custom-parameter.component';

describe('RepeatCustomParameterComponent', () => {
  let component: RepeatCustomParameterComponent;
  let fixture: ComponentFixture<RepeatCustomParameterComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [RepeatCustomParameterComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(RepeatCustomParameterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
