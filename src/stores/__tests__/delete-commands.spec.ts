import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { StorageClass } from '../../classes/storageClass';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIGreenBeanStorage } from '../../services/uiGreenBeanStorage';
import { UIMillStorage } from '../../services/uiMillStorage';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { MemoryDatabase, uuidsOf } from '../../test-utils/memory-database';
import { DeleteCommands } from '../delete-commands';

type Stored = Record<string, unknown> & {
  config: { uuid: string; rev?: number };
};

const STORAGES: Record<string, Type<StorageClass>> = {
  BEANS: UIBeanStorage,
  BREWS: UIBrewStorage,
  MILL: UIMillStorage,
  PREPARATION: UIPreparationStorage,
  GREEN_BEANS: UIGreenBeanStorage,
};

const stored = (
  uuid: string,
  fields: Record<string, unknown> = {},
  rev = 0,
): Stored => ({ config: { uuid, rev }, ...fields });

/**
 * The commands with the real collections and the real deletion journal on a
 * database in memory.
 */
describe('DeleteCommands', () => {
  let database: MemoryDatabase;
  let storages: Record<string, StorageClass>;
  let commands: DeleteCommands;

  const inMemory = (key: string) => uuidsOf(storages[key].getRawEntries());
  const noted = () => database.journal().map((_note) => _note.uuid);

  /** Starts with these stored entries, like the app after reading them. */
  async function start(seed: Record<string, Stored[]>) {
    storages = {};
    for (const [key, entries] of Object.entries(seed)) {
      database.values.set(key, entries);
      storages[key] = TestBed.inject(STORAGES[key]);
      await (
        storages[key] as StorageClass & { initializeStorage(): Promise<void> }
      )
        .initializeStorage()
        .catch(() => undefined);
    }
    commands = TestBed.inject(DeleteCommands);
  }

  beforeEach(() => {
    database = new MemoryDatabase();
    TestBed.configureTestingModule({ providers: database.providers() });
  });

  const WITH_BREWS = [
    { name: 'bean', key: 'BEANS', field: 'bean', command: 'deleteBean' },
    { name: 'mill', key: 'MILL', field: 'mill', command: 'deleteMill' },
    {
      name: 'preparation',
      key: 'PREPARATION',
      field: 'method_of_preparation',
      command: 'deletePreparation',
    },
  ] as const;

  for (const { name, key, field, command } of WITH_BREWS) {
    describe(`a ${name} with its brews`, () => {
      const brew = (uuid: string, of: string) =>
        stored(uuid, { [field]: of }, 1);
      const brewsOf = (of: string, count: number) =>
        Array.from({ length: count }, (_, i) => brew(`${of}-brew-${i}`, of));
      const run = (uuid: string) => commands[command](uuid);
      /**
       * Every other collection is there and readable, so a write to a
       * collection the command has no business with would show.
       */
      const startWith = (owners: Stored[], brews: Stored[]) =>
        start({
          BEANS: [],
          MILL: [],
          PREPARATION: [],
          GREEN_BEANS: [],
          [key]: owners,
          BREWS: brews,
        });

      it('deletes it and its 300 brews with one save per collection', async () => {
        const own = brewsOf('doomed', 300);
        await startWith(
          [stored('kept'), stored('doomed', {}, 4)],
          [
            brew('other-1', 'kept'),
            ...own.slice(0, 150),
            brew('other-2', 'kept'),
            ...own.slice(150),
            // Named by another field only.
            stored('other-3', { other: 'doomed' }),
          ],
        );
        const removed: string[] = [];
        for (const storage of [storages.BREWS, storages[key]]) {
          storage
            .attachOnRemove()
            .subscribe((_event) => removed.push(_event.id));
        }

        expect(await run('doomed')).toBeTrue();

        // Deleting the brews one by one saved the brews 300 times.
        expect(database.written()).toEqual([
          'BREWS',
          'DELETION_JOURNAL',
          key,
          'DELETION_JOURNAL',
        ]);
        const others = ['other-1', 'other-2', 'other-3'];
        expect(database.uuids('BREWS')).toEqual(others);
        expect(inMemory('BREWS')).toEqual(others);
        expect(database.uuids(key)).toEqual(['kept']);
        expect(inMemory(key)).toEqual(['kept']);
        expect(removed).toEqual([...uuidsOf(own), 'doomed']);
        const notes = database.journal();
        expect(notes.length).toBe(301);
        expect(noted().slice(0, 300)).toEqual(uuidsOf(own));
        expect(
          notes.slice(0, 300).every((_note) => _note.rev === 1),
        ).toBeTrue();
        expect(notes[300]).toEqual(
          jasmine.objectContaining({ collection: key, uuid: 'doomed', rev: 4 }),
        );

        // It is unknown from then on.
        expect(storages[key].getByUUID('doomed')).toBeUndefined();
        database.set.calls.reset();
        expect(await run('doomed')).toBeFalse();
        expect(database.set).not.toHaveBeenCalled();
      });

      it('saves only its own collection when it has no brews', async () => {
        await startWith([stored('doomed')], [brew('other', 'kept')]);

        expect(await run('doomed')).toBeTrue();

        expect(database.written()).toEqual([key, 'DELETION_JOURNAL']);
        expect(database.uuids(key)).toEqual([]);
        expect(database.uuids('BREWS')).toEqual(['other']);
        expect(noted()).toEqual(['doomed']);
      });

      it('writes nothing for an unknown one', async () => {
        await startWith([stored('kept')], brewsOf('unknown', 2));

        expect(await run('unknown')).toBeFalse();
        expect(await run('')).toBeFalse();

        expect(database.set).not.toHaveBeenCalled();
        expect(inMemory('BREWS').length).toBe(2);
      });

      for (const unreadable of [key, 'BREWS']) {
        it(`deletes nothing while ${unreadable} could not be read`, async () => {
          database.unreadable.add(unreadable);
          await startWith([stored('doomed')], brewsOf('doomed', 2));

          expect(await run('doomed')).toBeFalse();

          expect(database.set).not.toHaveBeenCalled();
          expect(database.uuids(key)).toEqual(['doomed']);
          expect(database.uuids('BREWS').length).toBe(2);
        });
      }

      it('deletes nothing while its collection does not take writes although it is known', async () => {
        await startWith([stored('doomed')], brewsOf('doomed', 2));
        const remove = spyOn(storages[key], 'removeManyByUUID').and.resolveTo(
          false,
        );

        expect(await run('doomed')).toBeFalse();

        expect(remove).toHaveBeenCalledOnceWith([]);
        expect(database.set).not.toHaveBeenCalled();
        expect(inMemory('BREWS').length).toBe(2);
      });

      it('keeps it and its brews when the brews cannot be saved', async () => {
        await startWith([stored('doomed')], brewsOf('doomed', 3));
        database.failingWrites.add('BREWS');

        expect(await run('doomed')).toBeFalse();

        expect(database.writes(key)).toBe(0);
        expect(inMemory(key)).toEqual(['doomed']);
        expect(database.uuids(key)).toEqual(['doomed']);
        expect(inMemory('BREWS')).toEqual(uuidsOf(brewsOf('doomed', 3)));
        expect(database.uuids('BREWS')).toEqual(uuidsOf(brewsOf('doomed', 3)));
        expect(database.values.has('DELETION_JOURNAL')).toBeFalse();
      });

      it('leaves it without brews when only its collection cannot be saved, and deletes it on the next try', async () => {
        await startWith([stored('doomed')], brewsOf('doomed', 3));
        database.failingWrites.add(key);

        expect(await run('doomed')).toBeFalse();

        expect(database.uuids('BREWS')).toEqual([]);
        expect(inMemory(key)).toEqual(['doomed']);
        expect(storages[key].getByUUID('doomed')).toBeDefined();
        expect(database.uuids(key)).toEqual(['doomed']);
        expect(database.journal().length).toBe(3);

        database.failingWrites.clear();
        database.set.calls.reset();
        expect(await run('doomed')).toBeTrue();

        expect(database.written()).toEqual([key, 'DELETION_JOURNAL']);
        expect(database.uuids(key)).toEqual([]);
      });

      it('removes both of its brews that share a uuid', async () => {
        await startWith(
          [stored('doomed')],
          [
            brew('twin', 'doomed'),
            brew('other', 'kept'),
            brew('twin', 'doomed'),
          ],
        );

        expect(await run('doomed')).toBeTrue();

        expect(database.uuids('BREWS')).toEqual(['other']);
        expect(noted()).toEqual(['twin', 'doomed']);
      });

      it('as before: of two brews sharing a uuid the first stored one is removed, whose ever it is', async () => {
        await startWith(
          [stored('kept'), stored('doomed')],
          [brew('twin', 'kept'), brew('twin', 'doomed')],
        );

        expect(await run('doomed')).toBeTrue();

        // The brew of the other one is gone and the one of the deleted one
        // is left behind, as when the brews were deleted one by one.
        expect(database.values.get('BREWS')).toEqual([brew('twin', 'doomed')]);
        expect(storages.BREWS.getRawEntries()).toEqual([
          brew('twin', 'doomed'),
        ]);
        expect(database.uuids(key)).toEqual(['kept']);
        expect(noted()).toEqual(['doomed']);
      });

      it('resolves false instead of rejecting', async () => {
        await startWith([stored('doomed')], brewsOf('doomed', 1));
        spyOn(storages.BREWS, 'getRawEntries').and.throwError('unexpected');

        await expectAsync(run('doomed')).toBeResolvedTo(false);

        expect(database.set).not.toHaveBeenCalled();
      });
    });
  }

  describe('a green bean with the beans roasted from it and their brews', () => {
    const roast = (uuid: string, from: string) =>
      stored(uuid, { bean_roast_information: { bean_uuid: from } }, 3);
    const brew = (uuid: string, bean: string) => stored(uuid, { bean }, 1);
    const seed = (): Record<string, Stored[]> => ({
      MILL: [],
      PREPARATION: [],
      GREEN_BEANS: [stored('kept'), stored('doomed', {}, 4)],
      BEANS: [
        roast('roast-1', 'doomed'),
        stored('bought'),
        // Bought beans may lack the roast information.
        stored('older', { bean_roast_information: null }),
        roast('roast-kept', 'kept'),
        roast('roast-2', 'doomed'),
      ],
      BREWS: [
        brew('brew-1', 'roast-2'),
        brew('other-1', 'bought'),
        ...Array.from({ length: 300 }, (_, i) => brew(`many-${i}`, 'roast-1')),
        brew('other-2', 'roast-kept'),
        // A green bean is no bean: this brew names no bean that goes.
        brew('other-3', 'doomed'),
        brew('brew-2', 'roast-2'),
      ],
    });
    const brews = [
      'brew-1',
      ...Array.from({ length: 300 }, (_, i) => `many-${i}`),
      'brew-2',
    ];
    const KEYS = ['BREWS', 'BEANS', 'GREEN_BEANS'];
    const state = (read: (key: string) => string[]) =>
      Object.fromEntries(KEYS.map((key) => [key, read(key)]));
    const untouched = () => state((key) => uuidsOf(seed()[key]));
    const gone = {
      BREWS: ['other-1', 'other-2', 'other-3'],
      BEANS: ['bought', 'older', 'roast-kept'],
      GREEN_BEANS: ['kept'],
    };

    it('deletes all of them with one save per collection, the brews first', async () => {
      await start(seed());
      const removed: string[] = [];
      for (const key of KEYS) {
        storages[key]
          .attachOnRemove()
          .subscribe((_event) => removed.push(_event.id));
      }

      expect(await commands.deleteGreenBean('doomed')).toBeTrue();

      expect(database.written()).toEqual(
        KEYS.flatMap((key) => [key, 'DELETION_JOURNAL']),
      );
      expect(state((key) => database.uuids(key))).toEqual(gone);
      expect(state(inMemory)).toEqual(gone);
      const all = [...brews, 'roast-1', 'roast-2', 'doomed'];
      expect(removed).toEqual(all);
      expect(noted()).toEqual(all);
      expect(database.journal().slice(-3)).toEqual([
        jasmine.objectContaining({ collection: 'BEANS', rev: 3 }),
        jasmine.objectContaining({ collection: 'BEANS', rev: 3 }),
        jasmine.objectContaining({ collection: 'GREEN_BEANS', rev: 4 }),
      ]);
    });

    it('saves only the green beans when nothing was roasted from it', async () => {
      await start({ ...seed(), GREEN_BEANS: [stored('lonely')] });

      expect(await commands.deleteGreenBean('lonely')).toBeTrue();

      expect(database.written()).toEqual(['GREEN_BEANS', 'DELETION_JOURNAL']);
      expect(database.uuids('GREEN_BEANS')).toEqual([]);
    });

    it('writes nothing for an unknown one', async () => {
      await start({ ...seed(), GREEN_BEANS: [stored('kept')] });

      expect(await commands.deleteGreenBean('doomed')).toBeFalse();
      expect(await commands.deleteGreenBean('')).toBeFalse();

      expect(database.set).not.toHaveBeenCalled();
    });

    for (const key of KEYS) {
      it(`deletes nothing while ${key} could not be read`, async () => {
        database.unreadable.add(key);
        await start(seed());

        expect(await commands.deleteGreenBean('doomed')).toBeFalse();

        expect(database.set).not.toHaveBeenCalled();
        expect(state((_key) => database.uuids(_key))).toEqual(untouched());
      });
    }

    it('keeps everything when the brews cannot be saved', async () => {
      await start(seed());
      database.failingWrites.add('BREWS');

      expect(await commands.deleteGreenBean('doomed')).toBeFalse();

      expect(database.written()).toEqual(['BREWS']);
      expect(state((key) => database.uuids(key))).toEqual(untouched());
      expect(state(inMemory)).toEqual(untouched());
    });

    const stopped: [failing: string, left: Record<string, string[]>][] = [
      ['BEANS', { ...untouched(), BREWS: gone.BREWS }],
      ['GREEN_BEANS', { ...gone, GREEN_BEANS: ['kept', 'doomed'] }],
    ];
    for (const [failing, left] of stopped) {
      it(`stops when ${failing} cannot be saved, and deletes the rest on the next try`, async () => {
        await start(seed());
        database.failingWrites.add(failing);

        expect(await commands.deleteGreenBean('doomed')).toBeFalse();

        expect(state((key) => database.uuids(key))).toEqual(left);
        expect(state(inMemory)).toEqual(left);

        database.failingWrites.clear();
        database.set.calls.reset();
        expect(await commands.deleteGreenBean('doomed')).toBeTrue();

        expect(database.written()).toEqual(
          KEYS.slice(KEYS.indexOf(failing)).flatMap((key) => [
            key,
            'DELETION_JOURNAL',
          ]),
        );
        expect(state((key) => database.uuids(key))).toEqual(gone);
      });
    }
  });
});
