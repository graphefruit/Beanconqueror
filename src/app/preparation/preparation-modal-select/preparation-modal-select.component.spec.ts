import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {PreparationModalSelectComponent} from './preparation-modal-select.component';

describe('PreparationModalSelectComponent', () => {
  let component: PreparationModalSelectComponent;
  let fixture: ComponentFixture<PreparationModalSelectComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PreparationModalSelectComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(PreparationModalSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
