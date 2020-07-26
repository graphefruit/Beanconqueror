import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {BeanPopoverActionsComponent} from './bean-popover-actions.component';

describe('BeanPopoverActionsComponent', () => {
  let component: BeanPopoverActionsComponent;
  let fixture: ComponentFixture<BeanPopoverActionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BeanPopoverActionsComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(BeanPopoverActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
