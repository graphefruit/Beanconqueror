/** What a file referenced by a stored entry is used for. */
export type ATTACHMENT_KIND =
  | 'photo'
  | 'brew_flow_profile'
  | 'imported_flow_profile'
  | 'graph_flow_profile'
  | 'baristamode_flow_profile';

/** One file referenced by a stored entry. */
export interface IAttachmentManifestEntry {
  /** Path exactly as the entry references it. */
  path: string;
  /** Storage key of the owning collection, for example 'BREWS'. */
  collection: string;
  /** uuid of the owning entry. */
  owner_uuid: string;
  kind: ATTACHMENT_KIND;
  /** Type after the file name. */
  mime: string;
  /** Size in bytes; null when the file was not found. */
  size: number | null;
  /** Milliseconds since epoch of the last check of the file, 0 = never. */
  checked_at: number;
}

/** List of the files referenced by the stored entries of this device. */
export interface IAttachmentManifest {
  version: 1;
  /**
   * Milliseconds since epoch when the list was last fully built, 0 while
   * the first build has not finished.
   */
  completed_at: number;
  entries: IAttachmentManifestEntry[];
}
