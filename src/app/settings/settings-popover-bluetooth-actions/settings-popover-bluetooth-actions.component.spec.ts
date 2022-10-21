import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { SettingsPopoverBluetoothActionsComponent } from './settings-popover-bluetooth-actions.component';

describe('SettingsPopoverBluetoothActionsComponent', () => {
  let component: SettingsPopoverBluetoothActionsComponent;
  let fixture: ComponentFixture<SettingsPopoverBluetoothActionsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [SettingsPopoverBluetoothActionsComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsPopoverBluetoothActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
