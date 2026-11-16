import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { StorageClass } from '../../../classes/storageClass';
import { Water } from '../../../classes/water/water';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIImage } from '../../../services/uiImage';
import { UIToast } from '../../../services/uiToast';
import { UIWaterHelper } from '../../../services/uiWaterHelper';
import { UIWaterStorage } from '../../../services/uiWaterStorage';
import { MemoryDatabase } from '../../../test-utils/memory-database';
import { WaterInformationCardComponent } from '../water-information-card.component';

interface StoredBrew {
  config: { uuid: string; rev: number; updated_by?: string };
  water: string;
}

const brew = (uuid: string, water: string): StoredBrew => ({
  config: { uuid, rev: 2 },
  water,
});

const ERROR_MESSAGE = ['ERROR_OCCURED', 'CARE', undefined, true];

describe('WaterInformationCardComponent deleting a water', () => {
  let database: MemoryDatabase;
  let brews: UIBrewStorage;
  let waters: UIWaterStorage;
  let component: WaterInformationCardComponent;
  let showConfirm: jasmine.Spy;
  let showMessage: jasmine.Spy;
  let showInfoToast: jasmine.Spy;

  /** 300 brews with the water among brews with another one or none. */
  const seed = (): StoredBrew[] => [
    brew('other', 'kept'),
    ...Array.from({ length: 300 }, (_, i) => brew(`brew-${i}`, 'doomed')),
    brew('none', ''),
  ];

  const storedBrews = () => database.values.get('BREWS') as StoredBrew[];
  const watersOf = (entries: readonly unknown[]) =>
    (entries as StoredBrew[]).map((_brew) => _brew.water);

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
        ...[ModalController, UIImage, UIWaterHelper, UIBrewHelper].map(
          (service) => ({ provide: service, useValue: {} }),
        ),
      ],
    });
    database.values.set('BREWS', seed());
    database.values.set('WATER', [
      { config: { uuid: 'kept' } },
      { config: { uuid: 'doomed' } },
    ]);
    brews = TestBed.inject(UIBrewStorage);
    waters = TestBed.inject(UIWaterStorage);
    await brews.initializeStorage();
    await waters.initializeStorage().catch(() => undefined);
    // Not rendered: deleting does not go through the template.
    component = TestBed.runInInjectionContext(
      () => new WaterInformationCardComponent(),
    );
    component.water = Object.assign(new Water(), {
      config: { uuid: 'doomed' },
    });
  });

  function expectNothingChanged(): void {
    expect(watersOf(storedBrews())).toEqual(watersOf(seed()));
    expect(watersOf(brews.getRawEntries())).toEqual(watersOf(seed()));
    expect(watersOf(brews.getAllEntries())).toEqual(watersOf(seed()));
    expect(database.uuids('WATER')).toEqual(['kept', 'doomed']);
    expect(showInfoToast).not.toHaveBeenCalled();
  }

  it('takes the water out of 300 brews with one save and deletes it', async () => {
    await component.delete();

    expect(database.writes('BREWS')).toBe(1);
    expect(database.written()).toEqual(['BREWS', 'WATER', 'DELETION_JOURNAL']);
    expect(watersOf(storedBrews())).toEqual([
      'kept',
      ...Array.from({ length: 300 }, () => ''),
      '',
    ]);
    // Each of them counts as changed by this device, the others do not.
    expect(storedBrews().map((_brew) => _brew.config.rev)).toEqual([
      2,
      ...Array.from({ length: 300 }, () => 3),
      2,
    ]);
    expect(storedBrews()[1].config.updated_by).toBe('device-a');
    expect(watersOf(brews.getAllEntries())).toEqual(watersOf(storedBrews()));
    expect(database.uuids('WATER')).toEqual(['kept']);
    expect(database.journal().map((_note) => _note.uuid)).toEqual(['doomed']);
    expect(showInfoToast).toHaveBeenCalledOnceWith(
      'TOAST_WATER_DELETED_SUCCESSFULLY',
    );
    expect(showMessage).not.toHaveBeenCalled();
  });

  it('changes nothing without a yes', async () => {
    showConfirm.and.resolveTo('NO');

    await component.delete();

    expect(database.set).not.toHaveBeenCalled();
    expectNothingChanged();
  });

  it('keeps the water and its brews when the brews cannot be saved', async () => {
    database.failingWrites.add('BREWS');
    // Brews handed out before, as a list on the screen holds them.
    const shown = brews.getAllEntries();

    await component.delete();

    expect(database.written()).toEqual(['BREWS']);
    expectNothingChanged();
    expect(watersOf(shown)).toEqual(watersOf(seed()));
    // The collection has told the user; the card adds nothing.
    expect(showMessage).toHaveBeenCalledTimes(1);
    expect(showMessage).not.toHaveBeenCalledWith(...ERROR_MESSAGE);
  });

  it('does not touch the brews when the waters could not be read', async () => {
    database.unreadable.add('WATER');
    await waters.reinitializeStorage().catch(() => undefined);

    await component.delete();

    expect(database.set).not.toHaveBeenCalled();
    expect(watersOf(storedBrews())).toEqual(watersOf(seed()));
    expect(showInfoToast).not.toHaveBeenCalled();
    expect(showMessage.calls.allArgs()).toEqual([
      ['STORAGE_NOT_READ_NOTHING_SAVED', undefined, undefined, true],
    ]);
  });

  it('shows its own message when the collection stays silent', async () => {
    database.unreadable.add('WATER');
    await waters.reinitializeStorage().catch(() => undefined);
    await component.delete();
    showMessage.calls.reset();

    await component.delete();

    expect(showMessage.calls.allArgs()).toEqual([ERROR_MESSAGE]);
    expect(showInfoToast).not.toHaveBeenCalled();
  });

  it('reports a water that could not be deleted after its brews were saved', async () => {
    database.failingWrites.add('WATER');

    await component.delete();

    // The water is left without brews and can be deleted again.
    expect(storedBrews().some((_brew) => _brew.water === 'doomed')).toBeFalse();
    expect(database.uuids('WATER')).toEqual(['kept', 'doomed']);
    expect(waters.getByUUID('doomed')).toBeDefined();
    expect(showInfoToast).not.toHaveBeenCalled();
    expect(showMessage).toHaveBeenCalledTimes(1);
  });
});
