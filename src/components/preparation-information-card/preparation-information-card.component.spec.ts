import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {PreparationInformationCardComponent} from './preparation-information-card.component';

describe('PreparationInformationCardComponent', () => {
  let component: PreparationInformationCardComponent;
  let fixture: ComponentFixture<PreparationInformationCardComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PreparationInformationCardComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(PreparationInformationCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
