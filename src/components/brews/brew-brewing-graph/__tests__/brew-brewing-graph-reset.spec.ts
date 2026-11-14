import { Brew } from '../../../../classes/brew/brew';
import { BrewFlow } from '../../../../classes/brew/brewFlow';
import { BrewBrewingGraphComponent } from '../brew-brewing-graph.component';

describe('BrewBrewingGraphComponent reset while editing', () => {
  const STORED_PATH = 'brews/brew-1_flow_profile.json';
  let component: BrewBrewingGraphComponent;
  let uiFileHelper: jasmine.SpyObj<any>;
  let bleManager: jasmine.SpyObj<any>;
  let scale: jasmine.SpyObj<any>;
  let readReference: jasmine.Spy;
  let initializeFlowChart: jasmine.Spy;

  function recordedFlow(): BrewFlow {
    const flow = new BrewFlow();
    flow.weight.push({ actual_weight: 12 } as any);
    return flow;
  }

  beforeEach(() => {
    uiFileHelper = jasmine.createSpyObj('UIFileHelper', [
      'deleteInternalFile',
      'writeInternalFileFromText',
    ]);
    uiFileHelper.deleteInternalFile.and.resolveTo();
    bleManager = jasmine.createSpyObj('CoffeeBluetoothDevicesService', [
      'getScale',
      'getPressureDevice',
      'getTemperatureDevice',
    ]);
    bleManager.getScale.and.returnValue(null);
    bleManager.getPressureDevice.and.returnValue(null);
    bleManager.getTemperatureDevice.and.returnValue(null);
    scale = jasmine.createSpyObj('BluetoothScale', ['tare', 'setTimer']);

    const data = new Brew();
    data.config.uuid = 'brew-1';
    data.flow_profile = STORED_PATH;

    component = Object.assign(
      Object.create(BrewBrewingGraphComponent.prototype),
      {
        isEdit: true,
        data,
        flow_profile_raw: recordedFlow(),
        uiFileHelper,
        bleManager,
        brewComponent: {},
        settings: { bluetooth_command_delay: 0 },
        uiAlert: jasmine.createSpyObj('UIAlert', {
          showLoadingSpinner: Promise.resolve(),
          hideLoadingSpinner: Promise.resolve(),
        }),
      },
    );
    for (const method of [
      'deattachToWeightChange',
      'deattachToFlowChange',
      'deattachToTextToSpeedChange',
      'attachToFlowChange',
    ] as const) {
      spyOn(component, method).and.stub();
    }
    initializeFlowChart = spyOn(component, 'initializeFlowChart').and.stub();
    readReference = spyOn<any>(
      component,
      'readReferenceFlowProfile',
    ).and.resolveTo();
  });

  it('keeps the stored file when a connected scale resets the graph', async () => {
    bleManager.getScale.and.returnValue(scale);

    await component.timerReset(undefined);

    expect(uiFileHelper.deleteInternalFile).not.toHaveBeenCalled();
    expect(uiFileHelper.writeInternalFileFromText).not.toHaveBeenCalled();
    // The form no longer refers to the graph, so saving removes it.
    expect(component.data.flow_profile).toBe('');
    expect(component.flow_profile_raw).toEqual(new BrewFlow());
    expect(initializeFlowChart).toHaveBeenCalledOnceWith(false);
  });

  it('keeps file and reference when nothing is connected', async () => {
    await component.timerReset(undefined);

    expect(uiFileHelper.deleteInternalFile).not.toHaveBeenCalled();
    expect(component.data.flow_profile).toBe(STORED_PATH);
    expect(component.flow_profile_raw).toEqual(new BrewFlow());
  });

  it('leaves a new brew without a file untouched', async () => {
    bleManager.getScale.and.returnValue(scale);
    component.isEdit = false;
    component.data.flow_profile = '';

    await component.timerReset(undefined);

    expect(uiFileHelper.deleteInternalFile).not.toHaveBeenCalled();
    expect(component.data.flow_profile).toBe('');
    expect(readReference).not.toHaveBeenCalled();
  });
});
