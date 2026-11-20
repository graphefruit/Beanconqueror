/** Name of the grinder added for brews from before there were grinders. */
export const STANDARD_MILL_NAME = 'Standard';

export interface StandardMillBrew {
  mill?: unknown;
  config?: { unix_timestamp?: unknown; created_at?: unknown };
  customInformation?: { imported?: unknown };
}

export interface StandardMillEntry {
  name?: unknown;
  config?: { uuid?: unknown; unix_timestamp?: unknown };
}

export interface StandardMillRepair {
  /** Uuid of the grinder the brews are to point at. */
  mill: string;
  brews: StandardMillBrew[];
  /** How many grinders are named "Standard". */
  standardMills: number;
}

/**
 * Up to now the app added the grinder "Standard" for brews from before
 * there were grinders, at start (UPDATE_1) and after an import, but stored
 * the brews with an empty grinder instead of its uuid. Those brews are the
 * ones that:
 *
 * - have an empty grinder: the brew form offers no empty choice;
 * - were created no later than the only grinder named "Standard"
 *   (`config.unix_timestamp`): the update changed every brew stored at that
 *   time;
 * - were not added later (`config.created_at`, milliseconds): only set by
 *   the app since change tracking; before that it is filled in from
 *   `unix_timestamp`;
 * - were not handed over from another app: such a brew is stored without a
 *   grinder when none matches (`customInformation.imported`).
 *
 * One brew with an empty grinder is taken although it is not one of them:
 * a quick repeat of a brew whose grinder is archived is stored with an
 * empty grinder, and when its date was then set back to before the grinder
 * "Standard" was added, it is pointed at that grinder. Brews added that way
 * since change tracking keep their real `created_at` and are left. For the
 * ones added before, no stored field tells them apart; it is accepted, the
 * user can choose another grinder for them.
 *
 * With no or several grinders named "Standard" no brew is chosen.
 */
export function brewsLeftWithoutStandardMill(
  _brews: readonly (StandardMillBrew | null)[],
  _mills: readonly (StandardMillEntry | null)[],
): StandardMillRepair {
  const standardMills = _mills.filter(
    (_mill) => _mill?.name === STANDARD_MILL_NAME,
  );
  const uuid = standardMills[0]?.config?.uuid;
  const added = standardMills[0]?.config?.unix_timestamp;
  if (
    standardMills.length !== 1 ||
    typeof uuid !== 'string' ||
    uuid === '' ||
    typeof added !== 'number'
  ) {
    return { mill: '', brews: [], standardMills: standardMills.length };
  }
  const brews = _brews.filter(
    (_brew) =>
      _brew?.mill === '' &&
      typeof _brew.config?.unix_timestamp === 'number' &&
      _brew.config.unix_timestamp <= added &&
      !(
        typeof _brew.config.created_at === 'number' &&
        _brew.config.created_at > added * 1000
      ) &&
      !_brew.customInformation?.imported,
  );
  return { mill: uuid, brews, standardMills: 1 };
}
