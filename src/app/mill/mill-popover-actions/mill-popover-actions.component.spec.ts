import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {MillPopoverActionsComponent} from './mill-popover-actions.component';

describe('MillPopoverActionsComponent', () => {
  let component: MillPopoverActionsComponent;
  let fixture: ComponentFixture<MillPopoverActionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MillPopoverActionsComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(MillPopoverActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
