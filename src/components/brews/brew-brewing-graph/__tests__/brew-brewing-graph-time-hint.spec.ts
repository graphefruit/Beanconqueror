import { Subject } from 'rxjs';

import { Brew } from '../../../../classes/brew/brew';
import { Preparation } from '../../../../classes/preparation/preparation';
import { Settings } from '../../../../classes/settings/settings';
import { StorageClass } from '../../../../classes/storageClass';
import { CoffeeBluetoothServiceEvent } from '../../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { UIAlert } from '../../../../services/uiAlert';
import { UIPreparationStorage } from '../../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { BrewBrewingComponent } from '../../brew-brewing/brew-brewing.component';
import { BrewBrewingGraphComponent } from '../brew-brewing-graph.component';

describe('BrewBrewingGraphComponent hint on the hidden brew time', () => {
  let component: BrewBrewingGraphComponent;
  let settings: Settings;
  let preparation: Preparation;
  let bluetoothEvents: Subject<CoffeeBluetoothServiceEvent>;
  let confirm: jasmine.Spy<UIAlert['showConfirmWithYesNoTranslation']>;
  let showMessage: jasmine.Spy<UIAlert['showMessage']>;
  let saveSettings: jasmine.Spy<UISettingsStorage['saveSettings']>;
  let updatePreparation: jasmine.Spy<UIPreparationStorage['update']>;

  beforeEach(() => {
    settings = new Settings();
    settings.manage_parameters.brew_time = false;
    preparation = new Preparation();
    bluetoothEvents = new Subject();
    confirm = jasmine.createSpy('showConfirmWithYesNoTranslation');
    confirm.and.resolveTo('NO');
    showMessage = jasmine.createSpy('showMessage');
    showMessage.and.resolveTo();
    saveSettings = jasmine.createSpy('saveSettings');
    saveSettings.and.resolveTo(true);
    updatePreparation = jasmine.createSpy('update');
    updatePreparation.and.resolveTo(true);
    spyOn(StorageClass, 'getMessagesShown').and.returnValue(0);

    component = Object.assign(
      Object.create(BrewBrewingGraphComponent.prototype),
      {
        data: new Brew(),
        isEdit: false,
        baristamode: false,
        settings,
        brewComponent: Object.assign(
          Object.create(BrewBrewingComponent.prototype),
          {
            timer: undefined,
            choosenPreparation: preparation,
            checkChanges: () => undefined,
          },
        ),
        // The web build counts the scale as connected.
        platform: { is: () => false },
        bleManager: { attachOnEvent: () => bluetoothEvents },
        uiAlert: { showConfirmWithYesNoTranslation: confirm, showMessage },
        uiSettingsStorage: { saveSettings },
        uiPreparationStorage: { update: updatePreparation },
        uiLog: jasmine.createSpyObj('UILog', ['error']),
      },
    );
    spyOn(component.data, 'getPreparation').and.returnValue(preparation);
    // Stubbed on the instance: the subscription calls some of them after a
    // timeout, when spies of a finished test would be gone.
    for (const method of [
      'toggleGraphElementsOnBaristaMode',
      '__connectSmartScale',
      '__connectPressureDevice',
      '__connectTemperatureDevice',
      'redrawGraph',
      'checkChanges',
      'getGraphIonColSize',
      'setUIParams',
    ] as const) {
      Object.assign(component, { [method]: () => undefined });
    }
  });

  afterEach(() => component['bluetoothSubscription']?.unsubscribe());

  /** Lets the dialog answer and the change be stored. */
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  it('asks once per brew when a device is connected or connects', async () => {
    await component.instance();
    bluetoothEvents.next(CoffeeBluetoothServiceEvent.CONNECTED_SCALE);
    await settle();

    expect(confirm).toHaveBeenCalledOnceWith(
      'TIME_PARAMETER_HINT_DESCRIPTION',
      'TIME_PARAMETER_HINT_TITLE',
      'TIME_PARAMETER_HINT_SHOW',
      'TIME_PARAMETER_HINT_NOT_NOW',
      true,
    );
    expect(settings.manage_parameters.brew_time).toBeFalse();
    expect(saveSettings).not.toHaveBeenCalled();
  });

  it('asks when a device connects after the form has opened', async () => {
    (component as unknown as { platform: unknown }).platform = {
      is: () => true,
    };
    (component as unknown as { bleManager: unknown }).bleManager = {
      attachOnEvent: () => bluetoothEvents,
      getScale: () => undefined,
      getPressureDevice: () => undefined,
      getTemperatureDevice: () => undefined,
    };
    await component.instance();
    expect(confirm).not.toHaveBeenCalled();

    bluetoothEvents.next(CoffeeBluetoothServiceEvent.CONNECTED_PRESSURE);
    await settle();

    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it('shows the brew time in the settings when the user agrees', async () => {
    confirm.and.resolveTo('YES');

    await component.instance();
    await settle();

    expect(settings.manage_parameters.brew_time).toBeTrue();
    expect(saveSettings).toHaveBeenCalledOnceWith(settings);
  });

  it('shows the brew time of a preparation with custom parameters', async () => {
    confirm.and.resolveTo('YES');
    settings.manage_parameters.brew_time = true;
    preparation.use_custom_parameters = true;
    preparation.manage_parameters.brew_time = false;

    await component.instance();
    await settle();

    expect(preparation.manage_parameters.brew_time).toBeTrue();
    expect(updatePreparation).toHaveBeenCalledOnceWith(preparation);
    expect(saveSettings).not.toHaveBeenCalled();
  });

  it('keeps the brew time hidden and reports when it cannot be stored', async () => {
    confirm.and.resolveTo('YES');
    saveSettings.and.resolveTo(false);

    await component.instance();
    await settle();

    expect(settings.manage_parameters.brew_time).toBeFalse();
    expect(showMessage).toHaveBeenCalledOnceWith(
      'STORAGE_SAVE_FAILED',
      undefined,
      undefined,
      true,
    );
  });

  it('does not ask when the brew time is shown', async () => {
    settings.manage_parameters.brew_time = true;

    await component.instance();
    await settle();

    expect(confirm).not.toHaveBeenCalled();
  });
});
