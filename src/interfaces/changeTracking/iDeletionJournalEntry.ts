/** Note that an entry was deleted on this installation. */
export interface IDeletionJournalEntry {
  /** Storage key of the collection, for example 'BREWS'. */
  collection: string;
  /** uuid of the deleted entry. */
  uuid: string;
  /** Milliseconds since epoch, clock of this device. */
  deleted_at: number;
  /** Device id of this installation. */
  device_id: string;
  /** Last known revision of the deleted entry, 0 when it had none. */
  rev: number;
}
