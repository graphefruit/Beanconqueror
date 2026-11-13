import { inject, Injectable } from '@angular/core';

import { DELETION_JOURNAL_STORAGE_KEY } from '../../classes/changeTracking/localStorageKeys';
import { IDeletionJournalEntry } from '../../interfaces/changeTracking/iDeletionJournalEntry';
import { UILog } from '../uiLog';
import { UIStorage } from '../uiStorage';

/**
 * Keeps the deletion journal: one note per entry that was deleted on this
 * device (collection, uuid, time, device id and last revision).
 *
 * Deleting stays as it is, the entry is removed from its collection at once;
 * the note only records that it happened. The journal stays on this device
 * under a local-only key and never goes into backup files, and importing a
 * backup never replaces it.
 *
 * All changes to the journal run one after another, so deletions that
 * happen at the same time, or one after the other in a cascade, never
 * overwrite each other's notes. Nothing is shortened.
 *
 * Every stored entry depends on this service, so it only imports services
 * that do not depend on the entry storages themselves.
 */
@Injectable({
  providedIn: 'root',
})
export class DeletionJournalService {
  private readonly uiStorage = inject(UIStorage);
  private readonly uiLog = inject(UILog);

  /** Notes known to be in the stored journal or waiting to be written. */
  private entries: IDeletionJournalEntry[] = [];
  /**
   * Notes taken while the stored journal could not be read. They are only
   * kept in memory, so the stored journal is never replaced by a partial
   * one, and are added once it was read.
   */
  private pending: IDeletionJournalEntry[] = [];
  private loaded = false;
  private loadFailed = false;
  private initialization: Promise<void> | undefined;
  private queue: Promise<unknown> = Promise.resolve();

  /**
   * Reads the stored journal. Runs only once; when reading fails, the next
   * note tries again.
   */
  public initialize(): Promise<void> {
    if (this.initialization === undefined) {
      this.initialization = this.__load();
    }
    return this.initialization;
  }

  /** Adds a note and stores the journal. Never rejects. */
  public record(_entry: IDeletionJournalEntry): Promise<void> {
    return this.__enqueue(async () => {
      // Only a read that failed before this note tries again, so a single
      // note never waits for two failing reads.
      const retryRead = this.loadFailed;
      await this.initialize();
      if (!this.loaded && retryRead) {
        await this.__load();
      }
      const entry = { ..._entry };
      if (!this.loaded) {
        this.pending.push(entry);
        this.uiLog.info(
          `DeletionJournalService - journal could not be read, note for ${entry.collection} kept in memory`,
        );
        return;
      }
      this.entries.push(entry);
      await this.__write();
    }, undefined);
  }

  /**
   * Forgets the notes about entries of `_collection` that exist again, for
   * example after a backup from before the deletion was imported. A note
   * must never claim that an existing entry was deleted. Does not try to
   * read the journal again when reading it failed. Resolves the number of
   * forgotten notes and never rejects.
   */
  public forgetExistingEntries(
    _collection: string,
    _existingUuids: ReadonlySet<string>,
  ): Promise<number> {
    return this.__enqueue(async () => {
      await this.initialize();
      const isExisting = (_note: IDeletionJournalEntry) =>
        _note.collection === _collection && _existingUuids.has(_note.uuid);
      const before = this.entries.length + this.pending.length;
      this.pending = this.pending.filter((_note) => !isExisting(_note));
      const kept = this.entries.filter((_note) => !isExisting(_note));
      const removedStored = this.entries.length - kept.length;
      this.entries = kept;
      if (removedStored > 0) {
        await this.__write();
      }
      const forgotten = before - this.entries.length - this.pending.length;
      if (forgotten > 0) {
        this.uiLog.log(
          `DeletionJournalService - forgot ${forgotten} notes about existing entries of ${_collection}`,
        );
      }
      return forgotten;
    }, 0);
  }

  /** For tests and diagnosis only. */
  public getEntries(): readonly IDeletionJournalEntry[] {
    return [...this.entries, ...this.pending];
  }

  private __enqueue<T>(_task: () => Promise<T>, _fallback: T): Promise<T> {
    const run = this.queue.then(_task).catch((ex) => {
      this.__logFailure('DeletionJournalService - task failed', ex);
      return _fallback;
    });
    this.queue = run;
    return run;
  }

  private async __load(): Promise<void> {
    const started = Date.now();
    let stored: unknown;
    try {
      stored = await this.uiStorage.getOrFail(DELETION_JOURNAL_STORAGE_KEY);
    } catch (ex) {
      this.__logFailure(
        'DeletionJournalService - stored journal could not be read',
        ex,
      );
      this.loadFailed = true;
      return;
    }
    this.loadFailed = false;

    const notes = Array.isArray(stored) ? stored : [];
    const valid = notes.filter((_note: unknown) =>
      DeletionJournalService.isValidEntry(_note),
    );
    if (stored !== null && stored !== undefined && !Array.isArray(stored)) {
      this.uiLog.info(
        'DeletionJournalService - stored journal is no list and will be replaced',
      );
    }
    if (valid.length !== notes.length) {
      this.uiLog.info(
        `DeletionJournalService - ${notes.length - valid.length} invalid notes left out`,
      );
    }
    this.entries = valid;
    this.loaded = true;
    this.uiLog.log(
      `DeletionJournalService - ${valid.length} notes read in ${Date.now() - started} ms`,
    );

    if (this.pending.length > 0) {
      this.entries.push(...this.pending);
      this.pending = [];
      await this.__write();
    }
  }

  /**
   * Stores the whole journal. When it cannot be stored, the notes stay in
   * memory and are written with the next note.
   */
  private async __write(): Promise<void> {
    try {
      await this.uiStorage.set(DELETION_JOURNAL_STORAGE_KEY, this.entries);
    } catch (ex) {
      this.__logFailure(
        'DeletionJournalService - journal could not be stored, notes kept in memory',
        ex,
      );
    }
  }

  private __logFailure(_message: string, _ex: unknown): void {
    try {
      this.uiLog.info(
        _message + ' - ' + (_ex instanceof Error ? _ex.message : 'unknown'),
      );
    } catch {
      // Logging must not change the result.
    }
  }

  private static isValidEntry(
    _value: unknown,
  ): _value is IDeletionJournalEntry {
    const entry = _value as Partial<IDeletionJournalEntry> | null;
    return (
      typeof entry === 'object' &&
      entry !== null &&
      typeof entry.collection === 'string' &&
      typeof entry.uuid === 'string' &&
      entry.uuid.length > 0
    );
  }
}
