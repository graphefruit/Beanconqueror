import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {ReportingLoggingParameterComponent} from './reporting-logging-parameter.component';

describe('ReportingLoggingParameterComponent', () => {
  let component: ReportingLoggingParameterComponent;
  let fixture: ComponentFixture<ReportingLoggingParameterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ReportingLoggingParameterComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportingLoggingParameterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
