/**
 * The lists a backup of Beanconqueror holds, at least one of which every
 * backup has had since the first version: the settings, the beans, the brews.
 */
const BACKUP_LISTS = ['SETTINGS', 'BEANS', 'BREWS'];

/**
 * The lists an export splits into parts: the first part stays in
 * Beanconqueror.json, each further one is a file of its own beside it.
 */
export const EXPORT_CHUNKING_CONFIG = [
  {
    propertyName: 'BREWS',
    fileName: 'Brews',
    chunkSize: 500,
  },
  {
    propertyName: 'BEANS',
    fileName: 'Beans',
    chunkSize: 500,
  },
  {
    propertyName: 'BARISTAMODE_BREWS',
    fileName: 'Baristamode',
    chunkSize: 250,
  },
];

/** A chosen file that is no backup of Beanconqueror; the message says why. */
export class NotABackupError extends Error {
  constructor(_problem: string) {
    super(_problem);
    this.name = 'NotABackupError';
  }
}

/**
 * Why the content of a chosen file is no backup of Beanconqueror, or null when
 * it is one. The format has no version mark, so it is told by its content:
 * an object with a list of settings, beans or brews. The check is lenient on
 * purpose, as a backup refused here locks its user out of the data.
 */
export function backupFormatProblem(_content: unknown): string | null {
  if (
    typeof _content !== 'object' ||
    _content === null ||
    Array.isArray(_content)
  ) {
    return 'The file holds no JSON object';
  }
  const record = _content as Record<string, unknown>;
  return BACKUP_LISTS.some((list) => Array.isArray(record[list]))
    ? null
    : `The file holds no list ${BACKUP_LISTS.join(', ')}`;
}

/**
 * Why a Beanconqueror.json chosen on its own can be only the first part of a
 * split export, or null. A list with exactly as many entries as one part can
 * be continued in the other files of the export, which are not read with it;
 * importing it alone would replace all data with that first part.
 */
export function splitExportPartProblem(_content: unknown): string | null {
  const record = (_content ?? {}) as Record<string, unknown>;
  const part = EXPORT_CHUNKING_CONFIG.find(
    (c) =>
      Array.isArray(record[c.propertyName]) &&
      (record[c.propertyName] as unknown[]).length === c.chunkSize,
  );
  return part
    ? `The list ${part.propertyName} holds ${part.chunkSize} entries, the size of the first part of an export split into several files`
    : null;
}
