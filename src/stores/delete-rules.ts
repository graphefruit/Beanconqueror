/**
 * What is deleted along with an entry, as pure functions of the stored
 * entries: building a Brew for each of 30,000 entries would take longer than
 * the deletion.
 */

/** The entries whose deletion takes brews along. */
export type Owner = 'bean' | 'mill' | 'preparation' | 'greenBean';

export type StoredEntry = Record<string, unknown> & {
  config?: { uuid?: string };
};
type Entries = readonly (StoredEntry | null)[];

const BREW_FIELD = {
  bean: 'bean',
  mill: 'mill',
  preparation: 'method_of_preparation',
} as const;

export function uuidsWhere(
  _entries: Entries,
  _matches: (_entry: StoredEntry) => boolean,
): string[] {
  const uuids: string[] = [];
  for (const entry of _entries) {
    if (entry && _matches(entry) && entry.config?.uuid) {
      uuids.push(entry.config.uuid);
    }
  }
  return uuids;
}

export function beansRoastedFrom(
  _beans: Entries,
  _greenBean: string,
): string[] {
  return uuidsWhere(
    _beans,
    (_bean) =>
      (_bean.bean_roast_information as { bean_uuid?: unknown } | undefined)
        ?.bean_uuid === _greenBean,
  );
}

/** For a green bean, the brews of the beans roasted from it. */
export function brewsDeletedWith(
  _owner: Owner,
  _uuid: string,
  _stored: { beans: Entries; brews: Entries },
): string[] {
  const [field, owners] =
    _owner === 'greenBean'
      ? [BREW_FIELD.bean, beansRoastedFrom(_stored.beans, _uuid)]
      : [BREW_FIELD[_owner], [_uuid]];
  const ownedBy = new Set<unknown>(owners);
  return uuidsWhere(_stored.brews, (_brew) => ownedBy.has(_brew[field]));
}

/**
 * The translation key of the question before deleting, by the number of
 * brews deleted along: `_NONE`, `_ONE` or `_OTHER` appended to `_question`.
 */
export function deleteQuestion(_question: string, _brews: number): string {
  const form = _brews === 0 ? 'NONE' : _brews === 1 ? 'ONE' : 'OTHER';
  return `${_question}_${form}`;
}
