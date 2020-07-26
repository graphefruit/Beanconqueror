import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {SortParameterComponent} from './sort-parameter.component';

describe('SortParameterComponent', () => {
  let component: SortParameterComponent;
  let fixture: ComponentFixture<SortParameterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SortParameterComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(SortParameterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
