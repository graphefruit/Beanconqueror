import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { TranslateService } from '@ngx-translate/core';

import { Brew } from '../../../../classes/brew/brew';
import { Preparation } from '../../../../classes/preparation/preparation';
import { PreparationTool } from '../../../../classes/preparation/preparationTool';
import { Settings } from '../../../../classes/settings/settings';
import { StorageClass } from '../../../../classes/storageClass';
import { DeviceIdentityService } from '../../../../services/deviceIdentity/device-identity.service';
import {
  ConfirmationDialogResult,
  UIAlert,
} from '../../../../services/uiAlert';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { UIBrewStorage } from '../../../../services/uiBrewStorage';
import { UIHelper } from '../../../../services/uiHelper';
import { UILog } from '../../../../services/uiLog';
import { UIPreparationStorage } from '../../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { UIStorage } from '../../../../services/uiStorage';
import { UIToast } from '../../../../services/uiToast';
import { createMockTranslateService } from '../../../../test-utils';
import { PreparationEditToolComponent } from '../preparation-edit-tool.component';

const T0 = 1_800_000_000_000;
const DELETED_AT = T0 + 60_000;

const PREPARATION_UUID = 'preparation-v60';
const FILTER_UUID = 'tool-filter';
const KETTLE_UUID = 'tool-kettle';
const SCALE_UUID = 'tool-scale';

/** Change info of entries last written on another device. */
const EARLIER_CHANGE = {
  created_at: T0,
  updated_at: T0,
  rev: 1,
  updated_by: 'device-b',
};

const CHANGE_BY_DELETION = {
  created_at: T0,
  updated_at: DELETED_AT,
  rev: 2,
  updated_by: 'device-a',
};

function storedTool(_uuid: string, _name: string): PreparationTool {
  const tool = new PreparationTool();
  tool.name = _name;
  tool.config.uuid = _uuid;
  tool.config.unix_timestamp = T0 / 1000;
  return tool;
}

function storedPreparation(): Preparation {
  const preparation = new Preparation();
  preparation.name = 'V60';
  preparation.config = {
    uuid: PREPARATION_UUID,
    unix_timestamp: T0 / 1000,
    ...EARLIER_CHANGE,
  };
  preparation.tools = [
    storedTool(FILTER_UUID, 'Paper filter'),
    storedTool(KETTLE_UUID, 'Kettle'),
    storedTool(SCALE_UUID, 'Scale'),
  ];
  return preparation;
}

function storedBrew(_uuid: string, _tools: string[]): Brew {
  const brew = new Brew();
  brew.method_of_preparation = PREPARATION_UUID;
  brew.method_of_preparation_tools = _tools;
  brew.config = {
    uuid: _uuid,
    unix_timestamp: T0 / 1000,
    ...EARLIER_CHANGE,
  };
  return brew;
}

/** Behaves like IndexedDB: values are copied when written and read. */
function createDevice(_initial: Record<string, unknown>) {
  const data = new Map<string, unknown>(
    Object.entries(structuredClone(_initial)),
  );
  const read = (_key: string) =>
    Promise.resolve(data.has(_key) ? structuredClone(data.get(_key)) : null);
  /** The keys in the order they were written, also when it failed. */
  const writes: string[] = [];
  /** Keys that cannot be written. */
  const failing = new Set<string>();
  return {
    data,
    writes,
    failing,
    uiStorage: {
      get: read,
      getOrFail: read,
      set: (_key: string, _value: unknown) => {
        writes.push(_key);
        if (failing.has(_key)) {
          return Promise.reject(new Error('write failed'));
        }
        data.set(_key, structuredClone(_value));
        return Promise.resolve(true);
      },
    },
  };
}

type Device = ReturnType<typeof createDevice>;

/** Starts the storages on the given device, like an app start. */
async function startApp(_device: Device) {
  const uiAlert = jasmine.createSpyObj('UIAlert', [
    'showConfirm',
    'showMessage',
  ]);
  uiAlert.showConfirm.and.resolveTo('YES');
  uiAlert.showMessage.and.resolveTo();
  const uiSettingsStorage = jasmine.createSpyObj('UISettingsStorage', [
    'getSettings',
    'saveSettings',
  ]);
  uiSettingsStorage.getSettings.and.returnValue(new Settings());
  uiSettingsStorage.saveSettings.and.resolveTo(true);
  const dismiss = jasmine.createSpy('dismiss');

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      PreparationEditToolComponent,
      { provide: UIStorage, useValue: _device.uiStorage },
      {
        provide: UILog,
        useValue: jasmine.createSpyObj('UILog', [
          'log',
          'info',
          'error',
          'debug',
        ]),
      },
      { provide: TranslateService, useValue: createMockTranslateService() },
      {
        provide: DeviceIdentityService,
        useValue: { getDeviceId: () => 'device-a' },
      },
      {
        provide: ModalController,
        useValue: { dismiss },
      },
      { provide: UIAlert, useValue: uiAlert },
      {
        provide: UIAnalytics,
        useValue: jasmine.createSpyObj('UIAnalytics', ['trackEvent']),
      },
      {
        provide: UIToast,
        useValue: jasmine.createSpyObj('UIToast', ['showInfoToast']),
      },
      {
        provide: UIHelper,
        useValue: {
          cloneData: (_value: unknown) => StorageClass.cloneData(_value),
        },
      },
      { provide: UISettingsStorage, useValue: uiSettingsStorage },
      { provide: HttpClient, useValue: {} },
    ],
  });
  const brewStorage = TestBed.inject(UIBrewStorage);
  const preparationStorage = TestBed.inject(UIPreparationStorage);
  await brewStorage.initializeStorage();
  await preparationStorage.initializeStorage();
  return {
    brewStorage,
    preparationStorage,
    uiAlert,
    uiSettingsStorage,
    dismiss,
  };
}

describe('PreparationEditToolComponent deleting a tool', () => {
  let now: number;
  let device: Device;

  beforeEach(() => {
    now = T0;
    spyOn(Date, 'now').and.callFake(() => now);
    // The collections report a failed save through the alert of the
    // running app. None runs here, whatever a spec before this one has
    // left behind.
    spyOn(UIAlert, 'getInstance').and.returnValue(undefined);
    device = createDevice({
      PREPARATION: [storedPreparation()],
      BREWS: [
        storedBrew('brew-with-all-tools', [
          FILTER_UUID,
          KETTLE_UUID,
          SCALE_UUID,
        ]),
        storedBrew('brew-with-scale', [SCALE_UUID]),
        storedBrew('brew-with-filter', [FILTER_UUID]),
      ],
    });
  });

  /** Starts the app again after the tool was deleted. */
  async function deleteToolAndRestart(
    _toolUuid: string,
    _choice: ConfirmationDialogResult = 'YES',
  ) {
    await deleteTool(_toolUuid, _choice);
    return startApp(device);
  }

  /**
   * Deletes the tool in the tool dialog, opened from the edit dialog of the
   * preparation.
   */
  async function deleteTool(
    _toolUuid: string,
    _choice: ConfirmationDialogResult = 'YES',
  ) {
    const app = await startApp(device);
    app.uiAlert.showConfirm.and.resolveTo(_choice);
    // The edit dialog works on its own copy of the preparation and hands it
    // over together with the tapped tool.
    const preparation = new Preparation();
    preparation.initializeByObject(
      app.preparationStorage.getByUUID(PREPARATION_UUID),
    );
    const dialog = TestBed.inject(PreparationEditToolComponent);
    Object.assign(dialog, {
      preparation,
      preparationTool: preparation.tools.find(
        (_tool) => _tool.config.uuid === _toolUuid,
      ),
    });
    dialog.ionViewWillEnter();

    now = DELETED_AT;
    await dialog.deleteTool();

    return app;
  }

  it('removes the tool from the stored preparation instead of archiving it', async () => {
    const restarted = await deleteToolAndRestart(SCALE_UUID);

    const [preparation] = restarted.preparationStorage.getAllEntries();
    expect(preparation.tools.map((_tool) => _tool.config.uuid)).toEqual([
      FILTER_UUID,
      KETTLE_UUID,
    ]);
    expect(preparation.tools.every((_tool) => !_tool.archived)).toBeTrue();
  });

  it('counts the deletion as a change of the preparation', async () => {
    const restarted = await deleteToolAndRestart(SCALE_UUID);

    const [preparation] = restarted.preparationStorage.getAllEntries();
    expect(preparation.config).toEqual(
      jasmine.objectContaining(CHANGE_BY_DELETION),
    );
  });

  it('removes the tool from the stored brews that used it', async () => {
    const restarted = await deleteToolAndRestart(SCALE_UUID);

    const brew = (_uuid: string) => restarted.brewStorage.getEntryByUUID(_uuid);
    expect(brew('brew-with-all-tools').method_of_preparation_tools).toEqual([
      FILTER_UUID,
      KETTLE_UUID,
    ]);
    expect(brew('brew-with-scale').method_of_preparation_tools).toEqual([]);
  });

  it('counts the removal as one change of each brew that used the tool', async () => {
    const restarted = await deleteToolAndRestart(SCALE_UUID);

    for (const uuid of ['brew-with-all-tools', 'brew-with-scale']) {
      expect(restarted.brewStorage.getEntryByUUID(uuid).config)
        .withContext(uuid)
        .toEqual(jasmine.objectContaining(CHANGE_BY_DELETION));
    }
  });

  it('leaves brews without the tool as they are', async () => {
    const restarted = await deleteToolAndRestart(SCALE_UUID);

    const brew = restarted.brewStorage.getEntryByUUID('brew-with-filter');
    expect(brew.method_of_preparation_tools).toEqual([FILTER_UUID]);
    expect(brew.config).toEqual(jasmine.objectContaining(EARLIER_CHANGE));
  });

  it('saves the brews once, however many used the tool', async () => {
    const app = await deleteTool(SCALE_UUID);

    expect(device.writes).toEqual(['BREWS', 'PREPARATION']);
    expect(app.uiAlert.showMessage).not.toHaveBeenCalled();
    expect(app.uiSettingsStorage.saveSettings).toHaveBeenCalledTimes(1);
    expect(app.dismiss).toHaveBeenCalledTimes(1);
  });

  it('keeps the tool in brews and preparation when the brews cannot be saved', async () => {
    const stored = structuredClone(Object.fromEntries(device.data));
    device.failing.add('BREWS');

    const app = await deleteTool(SCALE_UUID);

    expect(device.writes).toEqual(['BREWS']);
    expect(Object.fromEntries(device.data)).toEqual(stored);
    // In memory as well, also for a list that holds the brews already.
    for (const brew of app.brewStorage.getAllEntries()) {
      expect(brew.method_of_preparation_tools)
        .withContext(brew.config.uuid)
        .toEqual(
          app.brewStorage.getByUUID(brew.config.uuid)
            .method_of_preparation_tools,
        );
    }
    expect(
      app.brewStorage.getEntryByUUID('brew-with-scale')
        .method_of_preparation_tools,
    ).toEqual([SCALE_UUID]);
    expect(
      app.preparationStorage.getByUUID(PREPARATION_UUID).tools.length,
    ).toBe(3);
    expect(app.uiAlert.showMessage.calls.allArgs()).toEqual([
      ['ERROR_OCCURED', 'CARE', undefined, true],
    ]);
    // The dialog stays open and the filters stay as they are.
    expect(app.dismiss).not.toHaveBeenCalled();
    expect(app.uiSettingsStorage.saveSettings).not.toHaveBeenCalled();
  });

  it('reports a preparation that could not be saved after the brews', async () => {
    device.failing.add('PREPARATION');

    const app = await deleteTool(SCALE_UUID);

    expect(device.writes).toEqual(['BREWS', 'PREPARATION']);
    // What is in memory is what is stored: the preparation keeps the tool.
    expect(
      app.preparationStorage.getByUUID(PREPARATION_UUID).tools.length,
    ).toBe(3);
    expect(app.uiAlert.showMessage).toHaveBeenCalledTimes(1);
    expect(app.dismiss).not.toHaveBeenCalled();
  });

  it('writes nothing when the preparations could not be read', async () => {
    const app = await startApp(device);
    const preparation = new Preparation();
    preparation.initializeByObject(
      app.preparationStorage.getByUUID(PREPARATION_UUID),
    );
    const dialog = TestBed.inject(PreparationEditToolComponent);
    Object.assign(dialog, {
      preparation,
      preparationTool: preparation.tools[2],
    });
    dialog.ionViewWillEnter();
    spyOn(device.uiStorage, 'getOrFail').and.rejectWith(new Error('no read'));
    await app.preparationStorage.reinitializeStorage().catch(() => undefined);

    await dialog.deleteTool();

    expect(device.writes).toEqual([]);
    expect(app.uiAlert.showMessage).toHaveBeenCalledTimes(1);
    expect(app.dismiss).not.toHaveBeenCalled();
  });

  it('changes nothing when the deletion is not confirmed', async () => {
    const stored = structuredClone(Object.fromEntries(device.data));

    await deleteToolAndRestart(SCALE_UUID, 'NO');

    expect(Object.fromEntries(device.data)).toEqual(stored);
  });
});
