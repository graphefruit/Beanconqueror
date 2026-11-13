import { EventEmitter } from '@angular/core';

import { Brew } from '../../../../classes/brew/brew';
import { RefractionResultEvent } from '../../../../classes/devices/refractometerBluetoothDevice';
import { BrewBrewingComponent } from '../brew-brewing.component';

describe('BrewBrewingComponent refractometer', () => {
  let component: BrewBrewingComponent;
  let bleManager: jasmine.SpyObj<any>;
  let platform: jasmine.SpyObj<any>;

  beforeEach(() => {
    bleManager = jasmine.createSpyObj('CoffeeBluetoothDevicesService', [
      'getRefractometerDevice',
    ]);
    platform = jasmine.createSpyObj('Platform', ['is']);
    component = Object.assign(Object.create(BrewBrewingComponent.prototype), {
      bleManager,
      platform,
      data: new Brew(),
      uiLog: jasmine.createSpyObj('UILog', ['log']),
      uiAlert: jasmine.createSpyObj('UIAlert', ['hideLoadingSpinner']),
      uiToast: jasmine.createSpyObj('UIToast', ['showInfoToastBottom']),
    });
    spyOn(component, 'checkChanges').and.stub();
  });

  it('does not throw in the web build, where no refractometer exists', () => {
    platform.is.and.returnValue(false);
    bleManager.getRefractometerDevice.and.returnValue(null);

    expect(component.refractometerConnected()).toBeTrue();
    expect(() => component.attachToRefractometerChanges()).not.toThrow();
    expect(component.refractometerDeviceSubscription).toBeUndefined();
  });

  it('writes the TDS of a connected refractometer into the brew', async () => {
    platform.is.and.returnValue(true);
    const resultEvent = new EventEmitter<RefractionResultEvent>();
    bleManager.getRefractometerDevice.and.returnValue({
      resultEvent,
      getLastReading: () => ({ tds: 1.42, temp: 21 }),
    });

    component.attachToRefractometerChanges();
    resultEvent.emit(null);
    await Promise.resolve();

    expect(component.data.tds).toBe(1.42);
  });
});
