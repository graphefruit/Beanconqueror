import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {CuppingRadarComponent} from './cupping-radar.component';

describe('CuppingRadarComponent', () => {
  let component: CuppingRadarComponent;
  let fixture: ComponentFixture<CuppingRadarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CuppingRadarComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(CuppingRadarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
