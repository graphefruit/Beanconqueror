import { TestBed } from '@angular/core/testing';

import { TranslateService } from '@ngx-translate/core';

import { DeviceIdentityService } from '../../../services/deviceIdentity/device-identity.service';
import { UIAlert } from '../../../services/uiAlert';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UILog } from '../../../services/uiLog';
import { UIStorage } from '../../../services/uiStorage';
import {
  createMockTranslateService,
  createMockUIAlert,
} from '../../../test-utils';
import { BeanCommands } from '../bean-commands';

interface Stored {
  config: { uuid: string; rev?: number };
  bean?: string;
}

/**
 * The command with the real bean and brew collections and the real deletion
 * journal on a database in memory, which copies values like IndexedDB does.
 */
describe('BeanCommands', () => {
  let database: Map<string, unknown>;
  let failingWrites: Set<string>;
  let unreadable: Set<string>;
  let set: jasmine.Spy;
  let beans: UIBeanStorage;
  let brews: UIBrewStorage;
  let commands: BeanCommands;

  const bean = (uuid: string, rev = 0): Stored => ({ config: { uuid, rev } });
  const brew = (uuid: string, ofBean: string): Stored => ({
    config: { uuid, rev: 1 },
    bean: ofBean,
  });
  const brewsOf = (ofBean: string, count: number) =>
    Array.from({ length: count }, (_, i) =>
      brew(`${ofBean}-brew-${i}`, ofBean),
    );
  const uuids = (entries: readonly unknown[]) =>
    (entries as Stored[]).map((_entry) => _entry.config.uuid);
  const stored = (key: string) => uuids(database.get(key) as Stored[]);
  const writes = (key: string) =>
    set.calls.allArgs().filter(([_key]) => _key === key).length;
  const journal = () =>
    (database.get('DELETION_JOURNAL') ?? []) as Array<{
      collection: string;
      uuid: string;
      rev: number;
    }>;

  /** Starts with these stored entries, like the app after reading them. */
  async function start(storedBeans: Stored[], storedBrews: Stored[]) {
    database.set('BEANS', storedBeans);
    database.set('BREWS', storedBrews);
    beans = TestBed.inject(UIBeanStorage);
    brews = TestBed.inject(UIBrewStorage);
    await beans.initializeStorage().catch(() => undefined);
    await brews.initializeStorage().catch(() => undefined);
    commands = TestBed.inject(BeanCommands);
  }

  beforeEach(() => {
    database = new Map();
    failingWrites = new Set();
    unreadable = new Set();
    const read = (key: string) =>
      unreadable.has(key)
        ? Promise.reject(new Error('read failed'))
        : Promise.resolve(
            database.has(key) ? structuredClone(database.get(key)) : null,
          );
    set = jasmine
      .createSpy('set')
      .and.callFake((key: string, value: unknown) => {
        if (failingWrites.has(key)) {
          return Promise.reject(new Error('write failed'));
        }
        database.set(key, structuredClone(value));
        return Promise.resolve(true);
      });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UIStorage,
          useValue: {
            get: jasmine.createSpy('get').and.callFake(read),
            getOrFail: jasmine.createSpy('getOrFail').and.callFake(read),
            set,
          },
        },
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
      ],
    });
    spyOn(UIAlert, 'getInstance').and.returnValue(createMockUIAlert());
  });

  it('deletes a bean and its 300 brews with one save per collection', async () => {
    const own = brewsOf('doomed', 300);
    await start(
      [bean('kept'), bean('doomed', 4)],
      [
        brew('other-1', 'kept'),
        ...own.slice(0, 150),
        brew('other-2', 'kept'),
        ...own.slice(150),
      ],
    );
    const removed: string[] = [];
    brews.attachOnRemove().subscribe((_event) => removed.push(_event.id));
    beans.attachOnRemove().subscribe((_event) => removed.push(_event.id));

    expect(await commands.deleteWithBrews('doomed')).toBeTrue();

    // Deleting the brews one by one saved the brews 300 times.
    expect(writes('BREWS')).toBe(1);
    expect(writes('BEANS')).toBe(1);
    expect(writes('DELETION_JOURNAL')).toBe(2);
    expect(stored('BREWS')).toEqual(['other-1', 'other-2']);
    expect(uuids(brews.getRawEntries())).toEqual(['other-1', 'other-2']);
    expect(stored('BEANS')).toEqual(['kept']);
    expect(uuids(beans.getRawEntries())).toEqual(['kept']);
    expect(removed).toEqual([...uuids(own), 'doomed']);
    const notes = journal();
    expect(notes.length).toBe(301);
    expect(notes.slice(0, 300).map((_note) => _note.uuid)).toEqual(uuids(own));
    expect(notes.slice(0, 300).every((_note) => _note.rev === 1)).toBeTrue();
    expect(notes[300]).toEqual(
      jasmine.objectContaining({ collection: 'BEANS', uuid: 'doomed', rev: 4 }),
    );
  });

  it('saves only the beans for a bean without brews', async () => {
    await start([bean('doomed')], [brew('other', 'kept')]);

    expect(await commands.deleteWithBrews('doomed')).toBeTrue();

    expect(writes('BREWS')).toBe(0);
    expect(writes('BEANS')).toBe(1);
    expect(stored('BEANS')).toEqual([]);
    expect(stored('BREWS')).toEqual(['other']);
    expect(journal().map((_note) => _note.uuid)).toEqual(['doomed']);
  });

  it('writes nothing for an unknown bean', async () => {
    await start([bean('kept')], brewsOf('unknown', 2));

    expect(await commands.deleteWithBrews('unknown')).toBeFalse();
    expect(await commands.deleteWithBrews('')).toBeFalse();

    expect(set).not.toHaveBeenCalled();
    expect(uuids(brews.getRawEntries()).length).toBe(2);
  });

  for (const key of ['BEANS', 'BREWS']) {
    it(`deletes nothing while ${key} could not be read`, async () => {
      unreadable.add(key);
      await start([bean('doomed')], brewsOf('doomed', 2));

      expect(await commands.deleteWithBrews('doomed')).toBeFalse();

      expect(set).not.toHaveBeenCalled();
      expect(stored('BEANS')).toEqual(['doomed']);
      expect(stored('BREWS').length).toBe(2);
    });
  }

  it('deletes nothing while the beans do not take writes although the bean is known', async () => {
    await start([bean('doomed')], brewsOf('doomed', 2));
    const removeBeans = spyOn(beans, 'removeManyByUUID').and.resolveTo(false);

    expect(await commands.deleteWithBrews('doomed')).toBeFalse();

    expect(removeBeans).toHaveBeenCalledOnceWith([]);
    expect(set).not.toHaveBeenCalled();
    expect(uuids(brews.getRawEntries()).length).toBe(2);
  });

  it('keeps the bean and its brews when the brews cannot be saved', async () => {
    await start([bean('doomed')], brewsOf('doomed', 3));
    failingWrites.add('BREWS');

    expect(await commands.deleteWithBrews('doomed')).toBeFalse();

    expect(writes('BEANS')).toBe(0);
    expect(uuids(beans.getRawEntries())).toEqual(['doomed']);
    expect(stored('BEANS')).toEqual(['doomed']);
    expect(uuids(brews.getRawEntries())).toEqual(uuids(brewsOf('doomed', 3)));
    expect(stored('BREWS')).toEqual(uuids(brewsOf('doomed', 3)));
    expect(database.has('DELETION_JOURNAL')).toBeFalse();
  });

  it('leaves the bean without brews when only the beans cannot be saved, and deletes it on the next try', async () => {
    await start([bean('doomed')], brewsOf('doomed', 3));
    failingWrites.add('BEANS');

    expect(await commands.deleteWithBrews('doomed')).toBeFalse();

    expect(stored('BREWS')).toEqual([]);
    expect(uuids(beans.getRawEntries())).toEqual(['doomed']);
    expect(beans.getByUUID('doomed')).toBeDefined();
    expect(stored('BEANS')).toEqual(['doomed']);
    expect(journal().length).toBe(3);

    failingWrites.clear();
    set.calls.reset();
    expect(await commands.deleteWithBrews('doomed')).toBeTrue();

    expect(set.calls.allArgs().map(([key]) => key as string)).toEqual([
      'BEANS',
      'DELETION_JOURNAL',
    ]);
    expect(stored('BEANS')).toEqual([]);
  });

  it('removes both brews of the bean that share a uuid', async () => {
    await start(
      [bean('doomed')],
      [brew('twin', 'doomed'), brew('other', 'kept'), brew('twin', 'doomed')],
    );

    expect(await commands.deleteWithBrews('doomed')).toBeTrue();

    expect(stored('BREWS')).toEqual(['other']);
    expect(journal().map((_note) => _note.uuid)).toEqual(['twin', 'doomed']);
  });

  it('as before: of two brews sharing a uuid at different beans the first stored one is removed', async () => {
    await start(
      [bean('kept'), bean('doomed')],
      [brew('twin', 'kept'), brew('twin', 'doomed')],
    );

    expect(await commands.deleteWithBrews('doomed')).toBeTrue();

    // The brew of the other bean is gone and the one of the deleted bean is
    // left without its bean, as when the brews were deleted one by one.
    expect(database.get('BREWS')).toEqual([brew('twin', 'doomed')]);
    expect(brews.getRawEntries()).toEqual([brew('twin', 'doomed')]);
    expect(stored('BEANS')).toEqual(['kept']);
    expect(journal().map((_note) => _note.uuid)).toEqual(['doomed']);
  });

  it('resolves false instead of rejecting', async () => {
    await start([bean('doomed')], brewsOf('doomed', 1));
    spyOn(brews, 'getRawEntries').and.throwError('unexpected');

    await expectAsync(commands.deleteWithBrews('doomed')).toBeResolvedTo(false);

    expect(set).not.toHaveBeenCalled();
  });
});
