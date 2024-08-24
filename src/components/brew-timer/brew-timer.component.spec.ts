import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BrewTimerComponent } from './brew-timer.component';
import { ModalController } from '@ionic/angular';
import { CoffeeBluetoothDevicesService } from '../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { Settings } from '../../classes/settings/settings';
import { Device } from '@awesome-cordova-plugins/device/ngx';

describe('BrewTimerComponent', () => {
  let component: BrewTimerComponent;
  let fixture: ComponentFixture<BrewTimerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewTimerComponent],
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
    fixture = TestBed.createComponent(BrewTimerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
