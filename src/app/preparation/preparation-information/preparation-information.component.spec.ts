import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {PreparationInformationComponent} from './preparation-information.component';

describe('PreparationInformationComponent', () => {
  let component: PreparationInformationComponent;
  let fixture: ComponentFixture<PreparationInformationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [PreparationInformationComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(PreparationInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
