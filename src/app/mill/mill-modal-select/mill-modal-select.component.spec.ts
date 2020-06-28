import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {MillModalSelectComponent} from './mill-modal-select.component';

describe('MillModalSelectComponent', () => {
  let component: MillModalSelectComponent;
  let fixture: ComponentFixture<MillModalSelectComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MillModalSelectComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(MillModalSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
