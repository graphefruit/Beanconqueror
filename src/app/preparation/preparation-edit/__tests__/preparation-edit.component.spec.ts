import { TestBed } from '@angular/core/testing';

import { TranslateService } from '@ngx-translate/core';

import { Preparation } from '../../../../classes/preparation/preparation';
import { PreparationTool } from '../../../../classes/preparation/preparationTool';
import { DeviceIdentityService } from '../../../../services/deviceIdentity/device-identity.service';
import { UIAlert } from '../../../../services/uiAlert';
import { UILog } from '../../../../services/uiLog';
import { UIPreparationStorage } from '../../../../services/uiPreparationStorage';
import { UIStorage } from '../../../../services/uiStorage';
import { createMockTranslateService } from '../../../../test-utils';
import { PreparationEditComponent } from '../preparation-edit.component';

function storedPreparation(_uuid: string, _toolNames: string[]): Preparation {
  const preparation = new Preparation();
  preparation.name = _uuid;
  preparation.config.uuid = _uuid;
  preparation.tools = _toolNames.map((_name) => {
    const tool = new PreparationTool();
    tool.name = _name;
    tool.config.uuid = `${_uuid}-${_name}`;
    return tool;
  });
  return preparation;
}

describe('PreparationEditComponent', () => {
  let disk: Map<string, unknown>;
  let storage: UIPreparationStorage;

  beforeEach(async () => {
    spyOn(UIAlert, 'getInstance').and.returnValue(undefined);
    disk = new Map<string, unknown>([
      [
        'PREPARATION',
        structuredClone([
          storedPreparation('v60', ['Paper filter', 'Kettle']),
          storedPreparation('aeropress', ['Scale']),
        ]),
      ],
    ]);
    // Behaves like IndexedDB: values are copied when written and read.
    const read = (_key: string) =>
      Promise.resolve(structuredClone(disk.get(_key)));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UIStorage,
          useValue: {
            get: read,
            getOrFail: read,
            set: (_key: string, _value: unknown) => {
              disk.set(_key, structuredClone(_value));
              return Promise.resolve(true);
            },
          },
        },
        {
          provide: UILog,
          useValue: jasmine.createSpyObj('UILog', ['log', 'info', 'error']),
        },
        { provide: TranslateService, useValue: createMockTranslateService() },
        {
          provide: DeviceIdentityService,
          useValue: { getDeviceId: () => 'device-a' },
        },
      ],
    });
    storage = TestBed.inject(UIPreparationStorage);
    await storage.initializeStorage();
  });

  /** The edit dialog, opened from the list like the app does. */
  function openForm(): PreparationEditComponent {
    const form: PreparationEditComponent = Object.assign(
      Object.create(PreparationEditComponent.prototype),
      {
        data: new Preparation(),
        nextToolName: '',
        preparation: storage.getAllEntries()[0],
        uiAnalytics: jasmine.createSpyObj('UIAnalytics', ['trackEvent']),
        modalController: jasmine.createSpyObj('ModalController', ['dismiss']),
      },
    );
    form.ionViewWillEnter();
    return form;
  }

  const toolNames = (_preparation: { tools: PreparationTool[] }) =>
    _preparation.tools.map((_tool) => _tool.name);

  it('keeps a tool added and then cancelled out of the stored preparation', async () => {
    const form = openForm();
    form.nextToolName = 'Grinder';
    form.addTool();

    expect(toolNames(form.data)).toEqual(['Paper filter', 'Kettle', 'Grinder']);
    form.dismiss();

    expect(toolNames(storage.getByUUID('v60'))).toEqual([
      'Paper filter',
      'Kettle',
    ]);
    expect(toolNames(storage.getAllEntries()[0])).toEqual([
      'Paper filter',
      'Kettle',
    ]);

    // The next save of the collection, for another preparation.
    const other = new Preparation();
    other.initializeByObject(storage.getByUUID('aeropress'));
    other.name = 'AeroPress Go';
    expect(await storage.update(other)).toBeTruthy();

    const [v60, aeropress] = disk.get('PREPARATION') as Preparation[];
    expect(toolNames(v60)).toEqual(['Paper filter', 'Kettle']);
    expect(aeropress.name).toBe('AeroPress Go');
  });
});
