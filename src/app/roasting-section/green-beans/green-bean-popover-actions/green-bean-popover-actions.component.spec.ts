import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { GreenBeanPopoverActionsComponent } from './green-bean-popover-actions.component';

describe('GreenBeanPopoverActionsComponent', () => {
  let component: GreenBeanPopoverActionsComponent;
  let fixture: ComponentFixture<GreenBeanPopoverActionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GreenBeanPopoverActionsComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(GreenBeanPopoverActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
