/**
 * The lists a backup of Beanconqueror holds, at least one of which every
 * backup has had since the first version: the settings, the beans, the brews.
 */
const BACKUP_LISTS = ['SETTINGS', 'BEANS', 'BREWS'];

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
