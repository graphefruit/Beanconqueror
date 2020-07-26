import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {PreparationPopoverActionsComponent} from './preparation-popover-actions.component';

describe('PreparationPopoverActionsComponent', () => {
  let component: PreparationPopoverActionsComponent;
  let fixture: ComponentFixture<PreparationPopoverActionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [PreparationPopoverActionsComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(PreparationPopoverActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
