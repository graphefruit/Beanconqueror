import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { RoastingMachinePopoverActionsComponent } from './roasting-machine-popover-actions.component';

describe('RoastingMachinePopoverActionsComponent', () => {
  let component: RoastingMachinePopoverActionsComponent;
  let fixture: ComponentFixture<RoastingMachinePopoverActionsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ RoastingMachinePopoverActionsComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(RoastingMachinePopoverActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
