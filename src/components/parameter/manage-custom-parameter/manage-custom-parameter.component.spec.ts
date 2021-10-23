import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {ManageCustomParameterComponent} from './manage-custom-parameter.component';

describe('ManageCustomParameterComponent', () => {
  let component: ManageCustomParameterComponent;
  let fixture: ComponentFixture<ManageCustomParameterComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ManageCustomParameterComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ManageCustomParameterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
