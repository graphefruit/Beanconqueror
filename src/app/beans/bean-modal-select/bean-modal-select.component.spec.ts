import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {BeanModalSelectComponent} from './bean-modal-select.component';

describe('BeanModalSelectComponent', () => {
  let component: BeanModalSelectComponent;
  let fixture: ComponentFixture<BeanModalSelectComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BeanModalSelectComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(BeanModalSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
