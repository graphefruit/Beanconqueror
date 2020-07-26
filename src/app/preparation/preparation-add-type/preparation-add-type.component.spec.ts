import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {PreparationAddTypeComponent} from './preparation-add-type.component';

describe('PreparationAddTypeComponent', () => {
  let component: PreparationAddTypeComponent;
  let fixture: ComponentFixture<PreparationAddTypeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [PreparationAddTypeComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(PreparationAddTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
