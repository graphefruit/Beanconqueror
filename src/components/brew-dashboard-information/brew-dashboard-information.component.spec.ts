import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {BrewDashboardInformationComponent} from './brew-dashboard-information.component';

describe('BrewDashboardInformationComponent', () => {
  let component: BrewDashboardInformationComponent;
  let fixture: ComponentFixture<BrewDashboardInformationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BrewDashboardInformationComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(BrewDashboardInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
