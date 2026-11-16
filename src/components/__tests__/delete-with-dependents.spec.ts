import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { Settings } from '../../classes/settings/settings';
import { StorageClass } from '../../classes/storageClass';
import GREEN_BEAN_TRACKING from '../../data/tracking/greenBeanTracking';
import MILL_TRACKING from '../../data/tracking/millTracking';
import PREPARATION_TRACKING from '../../data/tracking/preparationTracking';
import { UIAlert } from '../../services/uiAlert';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIBeanHelper } from '../../services/uiBeanHelper';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIGreenBeanHelper } from '../../services/uiGreenBeanHelper';
import { UIGreenBeanStorage } from '../../services/uiGreenBeanStorage';
import { UIHelper } from '../../services/uiHelper';
import { UIImage } from '../../services/uiImage';
import { UIMillHelper } from '../../services/uiMillHelper';
import { UIMillStorage } from '../../services/uiMillStorage';
import { UIPreparationHelper } from '../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIToast } from '../../services/uiToast';
import { DeleteCommands } from '../../stores/delete-commands';
import { MemoryDatabase, uuidsOf } from '../../test-utils/memory-database';
import { GreenBeanInformationComponent } from '../green-bean-information/green-bean-information.component';
import { MillInformationCardComponent } from '../mill-information-card/mill-information-card.component';
import { PreparationInformationCardComponent } from '../preparation-information-card/preparation-information-card.component';

type Entry = Record<string, unknown> & { config: { uuid: string } };
type Seed = Record<string, Entry[]>;

const entry = (uuid: string, fields: Record<string, unknown> = {}): Entry => ({
  config: { uuid, rev: 2 } as Entry['config'],
  ...fields,
});

interface Card {
  name: string;
  component: new () => unknown;
  /** The collection of the card's entry and the input that takes it. */
  key: string;
  input: string;
  delete: string;
  command: 'deleteMill' | 'deletePreparation' | 'deleteGreenBean';
  question: string;
  toast: string;
  tracking: { TITLE: string; ACTIONS: { DELETE: string } };
  /** The entry `doomed` and what depends on it, among entries that stay. */
  seed: Seed;
  /** The collections in the order they are saved, and what they lose. */
  removed: [key: string, uuids: string[]][];
}

const brewsBy = (field: string): Entry[] => [
  entry('other-1', { [field]: 'kept' }),
  entry('brew-1', { [field]: 'doomed' }),
  entry('brew-2', { [field]: 'doomed' }),
  entry('other-2', { [field]: 'kept' }),
  entry('brew-3', { [field]: 'doomed' }),
  entry('other-3', {}),
];

const CARDS: Card[] = [
  {
    name: 'mill',
    component: MillInformationCardComponent,
    key: 'MILL',
    input: 'mill',
    delete: 'delete',
    command: 'deleteMill',
    question: 'DELETE_MILL_QUESTION',
    toast: 'TOAST_MILL_DELETED_SUCCESSFULLY',
    tracking: MILL_TRACKING,
    seed: {
      MILL: [entry('kept'), entry('doomed')],
      BREWS: brewsBy('mill'),
    },
    removed: [['BREWS', ['brew-1', 'brew-2', 'brew-3']]],
  },
  {
    name: 'preparation',
    component: PreparationInformationCardComponent,
    key: 'PREPARATION',
    input: 'preparation',
    delete: 'deletePreparation',
    command: 'deletePreparation',
    question: 'DELETE_PREPARATION_METHOD_QUESTION',
    toast: 'TOAST_PREPARATION_DELETED_SUCCESSFULLY',
    tracking: PREPARATION_TRACKING,
    seed: {
      PREPARATION: [entry('doomed'), entry('kept')],
      BREWS: brewsBy('method_of_preparation'),
    },
    removed: [['BREWS', ['brew-1', 'brew-2', 'brew-3']]],
  },
  {
    name: 'green bean',
    component: GreenBeanInformationComponent,
    key: 'GREEN_BEANS',
    input: 'greenBean',
    delete: 'deleteBean',
    command: 'deleteGreenBean',
    question: 'DELETE_GREEN_BEAN_QUESTION',
    toast: 'TOAST_GREEN_BEAN_DELETED_SUCCESSFULLY',
    tracking: GREEN_BEAN_TRACKING,
    // The beans roasted from the green bean go with it, and their brews.
    seed: {
      GREEN_BEANS: [entry('kept'), entry('doomed')],
      BEANS: [
        entry('roast-1', { bean_roast_information: { bean_uuid: 'doomed' } }),
        entry('bought', {}),
        entry('roast-kept', { bean_roast_information: { bean_uuid: 'kept' } }),
        entry('roast-2', { bean_roast_information: { bean_uuid: 'doomed' } }),
      ],
      BREWS: [
        entry('brew-1', { bean: 'roast-2' }),
        entry('other-1', { bean: 'bought' }),
        entry('brew-2', { bean: 'roast-1' }),
        entry('other-2', { bean: 'roast-kept' }),
        entry('brew-3', { bean: 'roast-2' }),
      ],
    },
    removed: [
      ['BREWS', ['brew-1', 'brew-2', 'brew-3']],
      ['BEANS', ['roast-1', 'roast-2']],
    ],
  },
];

const STORAGES: Record<string, Type<StorageClass>> = {
  BEANS: UIBeanStorage,
  BREWS: UIBrewStorage,
  MILL: UIMillStorage,
  PREPARATION: UIPreparationStorage,
  GREEN_BEANS: UIGreenBeanStorage,
};

/**
 * The cards whose entry takes other entries along when it is deleted, with
 * the real collections and the real deletion journal on a database in memory.
 */
for (const card of CARDS) {
  describe(`deleting a ${card.name} on its card`, () => {
    let database: MemoryDatabase;
    let storages: Record<string, StorageClass>;
    let settings: Settings;
    let showConfirm: jasmine.Spy;
    let withLoadingSpinner: jasmine.Spy;
    let showMessage: jasmine.Spy;
    let showInfoToast: jasmine.Spy;
    let trackEvent: jasmine.Spy;
    /** What happened, in order. */
    let steps: string[];
    let deleteEntry: () => Promise<void>;

    const kept = (key: string) => {
      const gone = new Set(
        key === card.key
          ? ['doomed']
          : card.removed.find(([_key]) => _key === key)?.[1],
      );
      return uuidsOf(card.seed[key]).filter((_uuid) => !gone.has(_uuid));
    };

    beforeEach(async () => {
      database = new MemoryDatabase();
      settings = new Settings();
      settings.bean_filter.OPEN.favourite = true;
      steps = [];
      const step = (name: string, result?: unknown) =>
        jasmine.createSpy(name).and.callFake(() => {
          steps.push(name);
          return result;
        });
      showConfirm = jasmine.createSpy('showConfirm').and.resolveTo('YES');
      // Like the real one: the spinner is hidden when the work has ended,
      // also by an error.
      withLoadingSpinner = jasmine
        .createSpy('withLoadingSpinner')
        .and.callFake(async <T>(work: () => T | Promise<T>) => {
          steps.push('spinner shown');
          try {
            return await work();
          } finally {
            steps.push('spinner hidden');
          }
        });
      showMessage = step('message', Promise.resolve());
      showInfoToast = step('toast');
      trackEvent = step('tracked');
      // The collections tell only once per start that they were not read.
      (
        StorageClass as unknown as { refusedWriteReported: boolean }
      ).refusedWriteReported = false;
      const alert = { showConfirm, withLoadingSpinner, showMessage };
      const providers = database.providers();
      // The card and the collections show their messages in the same place.
      (UIAlert.getInstance as jasmine.Spy).and.returnValue(alert);
      TestBed.configureTestingModule({
        providers: [
          ...providers,
          { provide: UIAlert, useValue: alert },
          { provide: UIToast, useValue: { showInfoToast } },
          { provide: UIAnalytics, useValue: { trackEvent } },
          {
            provide: UISettingsStorage,
            useValue: {
              getSettings: () => settings,
              saveSettings: step('filters reset', Promise.resolve()),
            },
          },
          ...[
            ModalController,
            UIBeanHelper,
            UIMillHelper,
            UIPreparationHelper,
            UIGreenBeanHelper,
            UIBrewHelper,
            UIImage,
            UIHelper,
          ].map((service) => ({ provide: service, useValue: {} })),
        ],
      });
      storages = {};
      for (const [key, entries] of Object.entries(card.seed)) {
        database.values.set(key, entries);
        storages[key] = TestBed.inject(STORAGES[key]);
        await (
          storages[key] as StorageClass & {
            initializeStorage(): Promise<void>;
          }
        ).initializeStorage();
      }
      // Not rendered: deleting does not go through the template.
      const component = TestBed.runInInjectionContext(
        () => new card.component() as Record<string, unknown>,
      );
      component[card.input] = (
        storages[card.key].getAllEntries() as Entry[]
      ).find((_entry) => _entry.config.uuid === 'doomed');
      deleteEntry = (component[card.delete] as () => Promise<void>).bind(
        component,
      ) as () => Promise<void>;
    });

    it('asks first and deletes nothing without a yes', async () => {
      showConfirm.and.resolveTo('NO');

      await deleteEntry();

      expect(showConfirm).toHaveBeenCalledOnceWith(
        card.question,
        'SURE_QUESTION',
        true,
      );
      expect(steps).toEqual([]);
      expect(database.set).not.toHaveBeenCalled();
    });

    it('removes it and what depends on it, then shows the toast and resets the filters', async () => {
      const removed: string[] = [];
      const events: string[] = [];
      for (const [key, storage] of Object.entries(storages)) {
        storage.attachOnRemove().subscribe((_event) => removed.push(_event.id));
        storage
          .attachOnEvent()
          .subscribe((_event) => events.push(`${key} ${_event.type}`));
      }

      await deleteEntry();

      expect(steps).toEqual([
        'spinner shown',
        'tracked',
        'toast',
        'filters reset',
        'spinner hidden',
      ]);
      expect(database.written().slice(-2)).toEqual([
        card.key,
        'DELETION_JOURNAL',
      ]);
      expect(trackEvent).toHaveBeenCalledOnceWith(
        card.tracking.TITLE,
        card.tracking.ACTIONS.DELETE,
      );
      expect(withLoadingSpinner.calls.mostRecent().args[1]).toBe(
        'PLEASE_WAIT_DO_NOT_CLOSE_APP',
      );
      expect(showInfoToast).toHaveBeenCalledOnceWith(card.toast);
      expect(settings.bean_filter.OPEN.favourite).toBeFalse();
      expect(showMessage).not.toHaveBeenCalled();

      // Stored and in memory: only the entry and what depends on it is gone.
      for (const key of Object.keys(card.seed)) {
        expect(database.uuids(key)).withContext(key).toEqual(kept(key));
        expect(uuidsOf(storages[key].getRawEntries()))
          .withContext(key)
          .toEqual(kept(key));
      }
      // The dependent entries first, with one save per collection.
      const saves = [...card.removed.map(([key]) => key), card.key];
      expect(database.written().filter((key) => key in card.seed)).toEqual(
        saves,
      );
      expect(events).toEqual(saves.map((key) => `${key} DELETE`));
      const notes = [
        ...card.removed.flatMap(([collection, uuids]) =>
          uuids.map((uuid) => ({ collection, uuid, rev: 2 })),
        ),
        { collection: card.key, uuid: 'doomed', rev: 2 },
      ];
      expect(removed).toEqual(notes.map((note) => note.uuid));
      expect(
        database.journal().map(({ collection, uuid, rev }) => ({
          collection,
          uuid,
          rev,
        })),
      ).toEqual(notes);
    });

    const OWN_MESSAGE = ['ERROR_OCCURED', 'CARE', undefined, true];
    const NOT_READ = [
      'STORAGE_NOT_READ_NOTHING_SAVED',
      undefined,
      undefined,
      true,
    ];
    const unreadableBrews = async () => {
      database.unreadable.add('BREWS');
      await storages.BREWS.reinitializeStorage().catch(() => undefined);
    };
    /** Each way a deletion fails, and the one message the user sees then. */
    const FAILURES: {
      name: string;
      arrange: () => unknown;
      message: unknown[];
    }[] = [
      {
        name: 'its collection could not be saved, which the collection tells',
        arrange: () => database.failingWrites.add(card.key),
        message: [jasmine.any(String), 'CRITICAL ERROR - SAVE SET'],
      },
      {
        name: 'the brews were not read, which the collection tells',
        arrange: unreadableBrews,
        message: NOT_READ,
      },
      {
        name: 'the brews were not read and the collection told so before',
        arrange: async () => {
          await unreadableBrews();
          await storages.BREWS.removeManyByUUID(['brew-1']);
          showMessage.calls.reset();
          steps = [];
        },
        message: OWN_MESSAGE,
      },
      {
        name: 'the note of the deletion could not be stored',
        arrange: () => database.failingWrites.add('PENDING_DELETION'),
        message: OWN_MESSAGE,
      },
      {
        name: 'the entry is gone already',
        arrange: () => storages[card.key].removeManyByUUID(['doomed']),
        message: OWN_MESSAGE,
      },
    ];
    for (const failure of FAILURES) {
      it(`shows exactly one message and nothing else when ${failure.name}`, async () => {
        await failure.arrange();

        await deleteEntry();

        expect(showMessage.calls.allArgs()).toEqual([failure.message]);
        // The card shows its own message only after the spinner.
        expect(steps).toEqual(
          failure.message === OWN_MESSAGE
            ? ['spinner shown', 'tracked', 'spinner hidden', 'message']
            : ['spinner shown', 'tracked', 'message', 'spinner hidden'],
        );
        expect(showInfoToast).not.toHaveBeenCalled();
        expect(settings.bean_filter.OPEN.favourite).toBeTrue();
      });
    }

    it('hides the spinner and shows no toast when deleting throws', async () => {
      spyOn(TestBed.inject(DeleteCommands), card.command).and.rejectWith(
        new Error('unexpected'),
      );

      await expectAsync(deleteEntry()).toBeRejected();

      expect(steps).toEqual(['spinner shown', 'tracked', 'spinner hidden']);
    });
  });
}
