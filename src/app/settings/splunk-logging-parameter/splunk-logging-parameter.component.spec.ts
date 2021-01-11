import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {SplunkLoggingParameterComponent} from './splunk-logging-parameter.component';

describe('SplunkLoggingParameterComponent', () => {
  let component: SplunkLoggingParameterComponent;
  let fixture: ComponentFixture<SplunkLoggingParameterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SplunkLoggingParameterComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(SplunkLoggingParameterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
