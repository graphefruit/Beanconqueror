import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TimerComponent } from './timer.component';
import { ModalController } from '@ionic/angular';
import { CoffeeBluetoothDevicesService } from '../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { Settings } from '../../classes/settings/settings';
import { Device } from '@awesome-cordova-plugins/device/ngx';

describe('TimerComponent', () => {
  let component: TimerComponent;
  let fixture: ComponentFixture<TimerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [TimerComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        {
          provide: ModalController,
          useValue: {},
        },
        {
          provide: CoffeeBluetoothDevicesService,
          useValue: {},
        },
        {
          provide: UISettingsStorage,
          useValue: {
            getSettings(): Settings {
              return {} as unknown as Settings;
            },
          },
        },
        {
          provide: Device,
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TimerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
