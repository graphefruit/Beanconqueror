import { PREPARATION_STYLE_TYPE } from '../../../../enums/preparations/preparationStyleTypes';
import { BrewBrewingGraphComponent } from '../brew-brewing-graph.component';

describe('BrewBrewingGraphComponent pressure device on preparation change', () => {
  let component: BrewBrewingGraphComponent;
  let bleManager: jasmine.SpyObj<any>;
  let setUIParams: jasmine.Spy;

  function pressureDevice(): jasmine.SpyObj<any> {
    return jasmine.createSpyObj('PressureDevice', {
      disableValueTransmission: Promise.resolve(),
      enableValueTransmission: undefined,
      updateZero: undefined,
    });
  }

  beforeEach(() => {
    bleManager = jasmine.createSpyObj('CoffeeBluetoothDevicesService', [
      'getPressureDevice',
    ]);
    bleManager.getPressureDevice.and.returnValue(null);
    component = Object.assign(
      Object.create(BrewBrewingGraphComponent.prototype),
      {
        bleManager,
        // The browser reports every device as connected to preview the graph.
        platform: { is: () => false },
        data: {
          getPreparation: () => ({
            style_type: PREPARATION_STYLE_TYPE.ESPRESSO,
          }),
        },
        brewComponent: {},
        settings: { pressure_threshold_active: false },
      },
    );
    spyOn(component, 'deattachToPressureChange').and.stub();
    spyOn(component, 'checkChanges').and.stub();
    setUIParams = spyOn<any>(component, 'setUIParams').and.resolveTo();
  });

  it('switches to espresso without a pressure device', async () => {
    await expectAsync(component.preparationChanged()).toBeResolved();

    expect(setUIParams).toHaveBeenCalled();
  });

  it('restarts the transmission of a connected device', async () => {
    const device = pressureDevice();
    bleManager.getPressureDevice.and.returnValue(device);

    await component.preparationChanged();

    expect(device.disableValueTransmission).toHaveBeenCalled();
    expect(device.enableValueTransmission).toHaveBeenCalled();
  });

  it('leaves a device alone that disconnected during the restart', async () => {
    const device = pressureDevice();
    bleManager.getPressureDevice.and.returnValues(device, null);

    await component.preparationChanged();

    expect(device.enableValueTransmission).not.toHaveBeenCalled();
    expect(setUIParams).toHaveBeenCalled();
  });
});
