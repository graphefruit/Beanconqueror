import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {CustomPopoverComponent} from './custom-popover.component';

describe('CustomPopoverComponent', () => {
  let component: CustomPopoverComponent;
  let fixture: ComponentFixture<CustomPopoverComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CustomPopoverComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomPopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
