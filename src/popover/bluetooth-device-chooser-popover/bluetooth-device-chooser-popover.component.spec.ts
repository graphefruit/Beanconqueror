import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BluetoothDeviceChooserPopoverComponent } from './bluetooth-device-chooser-popover.component';

describe('BluetoothDeviceChooserPopoverComponent', () => {
  let component: BluetoothDeviceChooserPopoverComponent;
  let fixture: ComponentFixture<BluetoothDeviceChooserPopoverComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BluetoothDeviceChooserPopoverComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(BluetoothDeviceChooserPopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
