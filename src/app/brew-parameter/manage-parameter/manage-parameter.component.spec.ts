import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {ManageParameterComponent} from './manage-parameter.component';

describe('ManageParameterComponent', () => {
  let component: ManageParameterComponent;
  let fixture: ComponentFixture<ManageParameterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ManageParameterComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ManageParameterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
