import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {BrewInformationComponent} from './brew-information.component';

describe('BrewInformationComponent', () => {
  let component: BrewInformationComponent;
  let fixture: ComponentFixture<BrewInformationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BrewInformationComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(BrewInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
