import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {SortCustomParameterComponent} from './sort-custom-parameter.component';

describe('SortCustomParameterComponent', () => {
  let component: SortCustomParameterComponent;
  let fixture: ComponentFixture<SortCustomParameterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SortCustomParameterComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(SortCustomParameterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
