import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { RoastingMachine } from '../../../classes/roasting-machine/roasting-machine';
import { StorageClass } from '../../../classes/storageClass';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIImage } from '../../../services/uiImage';
import { UIRoastingMachineHelper } from '../../../services/uiRoastingMachineHelper';
import { UIRoastingMachineStorage } from '../../../services/uiRoastingMachineStorage';
import { UIToast } from '../../../services/uiToast';
import { MemoryDatabase } from '../../../test-utils/memory-database';
import { RoastingMachineInformationCardComponent } from '../roasting-machine-information-card.component';

interface StoredBean {
  config: { uuid: string; rev: number; updated_by?: string };
  bean_roast_information: { roaster_machine: string; roast_length: number };
}

const bean = (uuid: string, machine: string): StoredBean => ({
  config: { uuid, rev: 2 },
  bean_roast_information: { roaster_machine: machine, roast_length: 600 },
});

const ERROR_MESSAGE = ['ERROR_OCCURED', 'CARE', undefined, true];

describe('RoastingMachineInformationCardComponent deleting a machine', () => {
  let database: MemoryDatabase;
  let beans: UIBeanStorage;
  let machines: UIRoastingMachineStorage;
  let component: RoastingMachineInformationCardComponent;
  let showConfirm: jasmine.Spy;
  let showMessage: jasmine.Spy;
  let showInfoToast: jasmine.Spy;

  /** 40 beans roasted on the machine among beans of another one or none. */
  const seed = (): StoredBean[] => [
    bean('other', 'kept'),
    ...Array.from({ length: 40 }, (_, i) => bean(`roast-${i}`, 'doomed')),
    bean('bought', ''),
  ];

  const storedBeans = () => database.values.get('BEANS') as StoredBean[];
  const machinesOf = (entries: readonly unknown[]) =>
    (entries as StoredBean[]).map(
      (_bean) => _bean.bean_roast_information.roaster_machine,
    );

  beforeEach(async () => {
    database = new MemoryDatabase();
    showConfirm = jasmine.createSpy('showConfirm').and.resolveTo('YES');
    showMessage = jasmine.createSpy('showMessage').and.resolveTo();
    showInfoToast = jasmine.createSpy('showInfoToast');
    // The collections tell only once per start that they were not read.
    (
      StorageClass as unknown as { refusedWriteReported: boolean }
    ).refusedWriteReported = false;
    const alert = {
      showConfirm,
      showMessage,
      withLoadingSpinner: <T>(work: () => Promise<T>) => work(),
    };
    const providers = database.providers();
    // The card and the collections show their messages in the same place.
    (UIAlert.getInstance as jasmine.Spy).and.returnValue(alert);
    TestBed.configureTestingModule({
      providers: [
        ...providers,
        { provide: UIAlert, useValue: alert },
        { provide: UIToast, useValue: { showInfoToast } },
        { provide: UIAnalytics, useValue: { trackEvent: () => undefined } },
        {
          provide: UIBeanHelper,
          useValue: {
            getAllRoastedBeansForRoastingMachine: (_uuid: string) =>
              beans
                .getAllEntries()
                .filter(
                  (_bean) =>
                    _bean.bean_roast_information.roaster_machine === _uuid,
                ),
          },
        },
        ...[ModalController, UIImage, UIRoastingMachineHelper].map(
          (service) => ({ provide: service, useValue: {} }),
        ),
      ],
    });
    database.values.set('BEANS', seed());
    database.values.set('ROASTING_MACHINES', [
      { config: { uuid: 'kept' } },
      { config: { uuid: 'doomed' } },
    ]);
    beans = TestBed.inject(UIBeanStorage);
    machines = TestBed.inject(UIRoastingMachineStorage);
    await beans.initializeStorage();
    await machines.initializeStorage();
    // Not rendered: deleting does not go through the template.
    component = TestBed.runInInjectionContext(
      () => new RoastingMachineInformationCardComponent(),
    );
    component.roastingMachine = Object.assign(new RoastingMachine(), {
      config: { uuid: 'doomed' },
    });
  });

  it('takes the machine out of 40 beans with one save and deletes it', async () => {
    await component.delete();

    expect(database.written()).toEqual([
      'BEANS',
      'ROASTING_MACHINES',
      'DELETION_JOURNAL',
    ]);
    expect(machinesOf(storedBeans())).toEqual([
      'kept',
      ...Array.from({ length: 40 }, () => ''),
      '',
    ]);
    // Each of them counts as changed by this device, the others do not.
    expect(storedBeans().map((_bean) => _bean.config.rev)).toEqual([
      2,
      ...Array.from({ length: 40 }, () => 3),
      2,
    ]);
    expect(storedBeans()[1].config.updated_by).toBe('device-a');
    // Nothing else of the roast is touched.
    expect(storedBeans()[1].bean_roast_information.roast_length).toBe(600);
    expect(machinesOf(beans.getAllEntries())).toEqual(
      machinesOf(storedBeans()),
    );
    expect(database.uuids('ROASTING_MACHINES')).toEqual(['kept']);
    expect(database.journal().map((_note) => _note.uuid)).toEqual(['doomed']);
    expect(showInfoToast).toHaveBeenCalledOnceWith(
      'TOAST_ROASTING_MACHINE_DELETED_SUCCESSFULLY',
    );
    expect(showMessage).not.toHaveBeenCalled();
  });

  it('changes nothing without a yes', async () => {
    showConfirm.and.resolveTo('NO');

    await component.delete();

    expect(database.set).not.toHaveBeenCalled();
    expect(showInfoToast).not.toHaveBeenCalled();
  });

  it('keeps the machine and its beans when the beans cannot be saved', async () => {
    database.failingWrites.add('BEANS');
    // Beans handed out before, as a list on the screen holds them.
    const shown = beans.getAllEntries();

    await component.delete();

    expect(database.written()).toEqual(['BEANS']);
    expect(machinesOf(storedBeans())).toEqual(machinesOf(seed()));
    expect(machinesOf(beans.getRawEntries())).toEqual(machinesOf(seed()));
    expect(machinesOf(beans.getAllEntries())).toEqual(machinesOf(seed()));
    expect(machinesOf(shown)).toEqual(machinesOf(seed()));
    expect(database.uuids('ROASTING_MACHINES')).toEqual(['kept', 'doomed']);
    expect(showInfoToast).not.toHaveBeenCalled();
    // The collection has told the user; the card adds nothing.
    expect(showMessage).toHaveBeenCalledTimes(1);
    expect(showMessage).not.toHaveBeenCalledWith(...ERROR_MESSAGE);
  });

  it('does not touch the beans when the machines could not be read', async () => {
    database.unreadable.add('ROASTING_MACHINES');
    await machines.reinitializeStorage().catch(() => undefined);

    await component.delete();
    // The collection tells it only once; then the card does.
    await component.delete();

    expect(database.set).not.toHaveBeenCalled();
    expect(showInfoToast).not.toHaveBeenCalled();
    expect(showMessage.calls.allArgs()).toEqual([
      ['STORAGE_NOT_READ_NOTHING_SAVED', undefined, undefined, true],
      ERROR_MESSAGE,
    ]);
  });

  it('reports a machine that could not be deleted after its beans were saved', async () => {
    database.failingWrites.add('ROASTING_MACHINES');

    await component.delete();

    // The machine is left without beans and can be deleted again.
    expect(machinesOf(storedBeans())).not.toContain('doomed');
    expect(database.uuids('ROASTING_MACHINES')).toEqual(['kept', 'doomed']);
    expect(machines.getByUUID('doomed')).toBeDefined();
    expect(showInfoToast).not.toHaveBeenCalled();
    expect(showMessage).toHaveBeenCalledTimes(1);
  });
});
