import { Brew } from '../../../../classes/brew/brew';
import { BrewFlow } from '../../../../classes/brew/brewFlow';
import { BrewEditComponent } from '../brew-edit.component';

describe('BrewEditComponent flow profile file', () => {
  const STORED_PATH = 'brews/brew-1_flow_profile.json';
  let component: BrewEditComponent;
  let uiFileHelper: jasmine.SpyObj<any>;
  let uiBrewStorage: jasmine.SpyObj<any>;
  let brewBrewing: jasmine.SpyObj<any>;
  let modalController: jasmine.SpyObj<any>;
  let graph: { flow_profile_raw: BrewFlow };
  let calls: string[];
  let storedFlowProfile: string | undefined;

  function recordedFlow(): BrewFlow {
    const flow = new BrewFlow();
    flow.weight.push({ actual_weight: 12 } as any);
    return flow;
  }

  /** What the graph does when a connected device resets it. */
  function resetGraph(): void {
    component.data.flow_profile = '';
    graph.flow_profile_raw = new BrewFlow();
  }

  function createComponent(_storedPath: string): void {
    const stored = new Brew();
    stored.config.uuid = 'brew-1';
    stored.config.unix_timestamp = 1700000000;
    stored.flow_profile = _storedPath;

    graph = {
      flow_profile_raw: _storedPath === '' ? new BrewFlow() : recordedFlow(),
    };
    brewBrewing = jasmine.createSpyObj('BrewBrewingComponent', [
      'saveFlowProfile',
    ]);
    brewBrewing.brewBrewingGraphEl = graph;
    brewBrewing.customCreationDate = new Date(1700000000 * 1000).toISOString();
    brewBrewing.saveFlowProfile.and.callFake((_uuid: string) => {
      calls.push('write');
      return Promise.resolve('brews/' + _uuid + '_flow_profile.json');
    });
    modalController = jasmine.createSpyObj('ModalController', ['dismiss']);

    component = Object.assign(Object.create(BrewEditComponent.prototype), {
      brew: stored,
      data: new Brew(),
      settings: {
        security_check_when_going_back: false,
        visualizer_active: false,
      },
      brewBrewing,
      uiFileHelper,
      uiBrewStorage,
      uiBrewHelper: jasmine.createSpyObj('UIBrewHelper', [
        'cleanInvisibleBrewData',
      ]),
      uiPreparationHelper: jasmine.createSpyObj('UIPreparationHelper', {
        doMachineSpecificSyncs: Promise.resolve(),
      }),
      brewTracking: jasmine.createSpyObj('BrewTrackingService', ['trackBrew']),
      uiToast: jasmine.createSpyObj('UIToast', ['showInfoToast']),
      uiAnalytics: jasmine.createSpyObj('UIAnalytics', ['trackEvent']),
      bleManager: jasmine.createSpyObj('CoffeeBluetoothDevicesService', {
        getScale: null,
      }),
      modalController,
    });
    component.ngOnInit();
    spyOn(component.data, 'getPreparation').and.returnValue({} as any);
  }

  beforeEach(() => {
    calls = [];
    storedFlowProfile = undefined;
    uiFileHelper = jasmine.createSpyObj('UIFileHelper', ['deleteInternalFile']);
    uiFileHelper.deleteInternalFile.and.callFake((_path: string) => {
      calls.push('delete ' + _path);
      return Promise.resolve();
    });
    uiBrewStorage = jasmine.createSpyObj('UIBrewStorage', ['update']);
    uiBrewStorage.update.and.callFake((_brew: Brew) => {
      calls.push('store');
      storedFlowProfile = _brew.flow_profile;
      return Promise.resolve(true);
    });
    createComponent(STORED_PATH);
  });

  it('removes the file after the brew was stored without its graph', async () => {
    resetGraph();

    await component.updateBrew();

    expect(storedFlowProfile).toBe('');
    expect(calls).toEqual(['store', 'delete ' + STORED_PATH]);
  });

  it('replaces the file when a new graph was recorded after the reset', async () => {
    resetGraph();
    graph.flow_profile_raw = recordedFlow();

    await component.updateBrew();

    expect(brewBrewing.saveFlowProfile).toHaveBeenCalledOnceWith('brew-1');
    expect(storedFlowProfile).toBe(STORED_PATH);
    expect(calls).toEqual(['write', 'store']);
  });

  it('removes the file when the new graph could not be written', async () => {
    resetGraph();
    graph.flow_profile_raw = recordedFlow();
    brewBrewing.saveFlowProfile.and.resolveTo('');

    await component.updateBrew();

    expect(storedFlowProfile).toBe('');
    expect(calls).toEqual(['store', 'delete ' + STORED_PATH]);
  });

  it('keeps file and reference when the graph was not reset', async () => {
    await component.updateBrew();

    expect(storedFlowProfile).toBe(STORED_PATH);
    expect(uiFileHelper.deleteInternalFile).not.toHaveBeenCalled();
  });

  it('keeps file and reference when a reset emptied only the shown graph', async () => {
    graph.flow_profile_raw = new BrewFlow();

    await component.updateBrew();

    expect(brewBrewing.saveFlowProfile).not.toHaveBeenCalled();
    expect(storedFlowProfile).toBe(STORED_PATH);
    expect(uiFileHelper.deleteInternalFile).not.toHaveBeenCalled();
  });

  it('still finishes saving when the file cannot be removed', async () => {
    resetGraph();
    uiFileHelper.deleteInternalFile.and.rejectWith(new Error('no such file'));

    await component.updateBrew();

    expect(storedFlowProfile).toBe('');
    expect(modalController.dismiss).toHaveBeenCalledTimes(1);
  });

  it('keeps the file when the brew could not be stored', async () => {
    resetGraph();
    uiBrewStorage.update.and.resolveTo(false);

    await component.updateBrew();

    expect(uiFileHelper.deleteInternalFile).not.toHaveBeenCalled();
  });

  it('touches no file for a brew that never had a graph', async () => {
    createComponent('');

    await component.updateBrew();

    expect(storedFlowProfile).toBe('');
    expect(uiFileHelper.deleteInternalFile).not.toHaveBeenCalled();
    expect(brewBrewing.saveFlowProfile).not.toHaveBeenCalled();
  });

  it('leaves brew and file alone when editing is cancelled after a reset', async () => {
    resetGraph();

    await component.confirmDismiss();

    expect(modalController.dismiss).toHaveBeenCalledTimes(1);
    expect(uiBrewStorage.update).not.toHaveBeenCalled();
    expect(uiFileHelper.deleteInternalFile).not.toHaveBeenCalled();
    expect(component.brew.flow_profile).toBe(STORED_PATH);
  });
});
