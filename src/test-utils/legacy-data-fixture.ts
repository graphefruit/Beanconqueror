import { Bean } from '../classes/bean/bean';
import BaristamodeBrew from '../classes/brew/baristamodeBrew';
import { Brew } from '../classes/brew/brew';
import { Graph } from '../classes/graph/graph';
import { GreenBean } from '../classes/green-bean/green-bean';
import { Mill } from '../classes/mill/mill';
import { Preparation } from '../classes/preparation/preparation';
import { PreparationTool } from '../classes/preparation/preparationTool';
import { RoastingMachine } from '../classes/roasting-machine/roasting-machine';
import { Settings } from '../classes/settings/settings';
import { Water } from '../classes/water/water';

/** First unix timestamp (seconds) used by the generated entries. */
export const LEGACY_FIXTURE_START = 1_600_000_000;

/** Uuid shared by two identical brews, as found in long used installations. */
export const LEGACY_DUPLICATE_BREW_UUID = 'brew-duplicate';
/** Brew whose unix timestamp is stored in milliseconds. */
export const LEGACY_MILLISECONDS_BREW_UUID = 'brew-milliseconds';
/** Brew without a unix timestamp. */
export const LEGACY_NO_TIMESTAMP_BREW_UUID = 'brew-no-timestamp';

/** An entry as it is written to storage. */
export type StoredEntry = Record<string, any>;

/** Stored data as an instance of the class would be written to storage. */
function stored<T>(_instance: T, _uuid: string, _index: number): StoredEntry {
  const raw: StoredEntry = JSON.parse(JSON.stringify(_instance));
  raw.config.uuid = _uuid;
  raw.config.unix_timestamp = LEGACY_FIXTURE_START + _index * 60;
  return raw;
}

function many<T>(
  _prefix: string,
  _count: number,
  _create: (index: number) => T,
): StoredEntry[] {
  return Array.from({ length: _count }, (_, i) =>
    stored(_create(i), `${_prefix}-${i}`, i),
  );
}

export interface LegacyDataOptions {
  /** Number of regular brews, without the special ones. Default 1203. */
  brews?: number;
  /** Number of beans. Default 40. */
  beans?: number;
}

/**
 * Synthetic data as an app version without change tracking stores it: no
 * change info in any config, settings without a user profile and all data
 * updates up to UPDATE_15 done.
 *
 * Contains every collection, attachments with and without a leading slash,
 * flow profiles, a preparation with tools, a pair of identical brews that
 * share a uuid, one brew with a unix timestamp in milliseconds and one
 * without a unix timestamp.
 */
export function createLegacyData(
  _options: LegacyDataOptions = {},
): Record<string, any> {
  const brewCount = _options.brews ?? 1203;
  const beanCount = _options.beans ?? 40;

  const settings: StoredEntry = JSON.parse(JSON.stringify(new Settings()));
  delete settings.user;

  const beans = many('bean', beanCount, (i) => {
    const bean = new Bean();
    bean.name = `Bean ${i}`;
    bean.attachments = i === 0 ? ['photo_x.jpg', '/photo_y.jpg'] : [];
    return bean;
  });

  const preparation = stored(new Preparation(), 'preparation-0', 0);
  preparation.name = 'V60';
  preparation.tools = ['filter', 'kettle'].map((_name, i) => {
    const tool = new PreparationTool();
    tool.name = _name;
    return stored(tool, `tool-${i}`, i);
  });

  const brews = many('brew', brewCount, (i) => {
    const brew = new Brew();
    brew.bean = `bean-${i % beanCount}`;
    brew.method_of_preparation = 'preparation-0';
    brew.mill = 'mill-0';
    brew.grind_weight = 18;
    return brew;
  });
  for (let i = 0; i < brewCount; i += 4) {
    brews[i].flow_profile = `brews/${brews[i].config.uuid}_flow_profile.json`;
  }
  const duplicate = stored(new Brew(), LEGACY_DUPLICATE_BREW_UUID, brewCount);
  duplicate.note = 'stored twice';
  const milliseconds = stored(
    new Brew(),
    LEGACY_MILLISECONDS_BREW_UUID,
    brewCount + 1,
  );
  milliseconds.config.unix_timestamp = (LEGACY_FIXTURE_START + 30) * 1000;
  const noTimestamp = stored(
    new Brew(),
    LEGACY_NO_TIMESTAMP_BREW_UUID,
    brewCount + 2,
  );
  delete noTimestamp.config.unix_timestamp;
  brews.push(duplicate, structuredClone(duplicate), milliseconds, noTimestamp);

  const graph = stored(new Graph(), 'graph-0', 0);
  graph.flow_profile = 'graphs/graph-0_flow_profile.json';

  const baristamodeBrews = many('barista', 3, () => new BaristamodeBrew());
  baristamodeBrews[0].flow_profile = 'baristamode/barista-0_flow_profile.json';

  const updatedDataVersions = Array.from(
    { length: 15 },
    (_, i) => `UPDATE_${i + 1}`,
  );

  return {
    VERSION: [
      {
        config: { uuid: 'version-0', unix_timestamp: LEGACY_FIXTURE_START },
        alreadyDisplayedVersions: ['8.8.0'],
        updatedDataVersions,
      },
    ],
    SETTINGS: [settings],
    BEANS: beans,
    BREWS: brews,
    PREPARATION: [preparation],
    MILL: many('mill', 2, () => new Mill()),
    WATER: many('water', 2, () => new Water()),
    GREEN_BEANS: many('green-bean', 2, () => new GreenBean()),
    ROASTING_MACHINES: many('roasting-machine', 1, () => new RoastingMachine()),
    GRAPH: [graph],
    BARISTAMODE_BREWS: baristamodeBrews,
  };
}
