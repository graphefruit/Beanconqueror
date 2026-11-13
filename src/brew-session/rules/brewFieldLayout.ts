import type { OrderBrewParameter } from '../../classes/parameter/orderBrewParameter';
import { PREPARATION_STYLE_TYPE } from '../../enums/preparations/preparationStyleTypes';
import type { IManageBrewParameter } from '../../interfaces/parameter/iManageBrewParameter';

/**
 * Which fields the brew form and the brew details show, and in which order.
 *
 * Screen readers and the Tab key follow the markup, so the views render
 * their fields in this order instead of sorting them on screen with the CSS
 * `order` property. Fields with the same sort order keep the order they had
 * in the markup then, which was their order on screen as well. Conditions on
 * the state of a view (the chosen grinder, the loaded brew) stay in its
 * template.
 */

type BeforeParameter = keyof OrderBrewParameter['before'];
type WhileParameter = keyof OrderBrewParameter['while'];
type AfterParameter = keyof OrderBrewParameter['after'];

/** A brew parameter with a place in the sort order of its section. */
export type BrewParameterKey =
  | BeforeParameter
  | WhileParameter
  | AfterParameter;

/**
 * An entry of a section: a brew parameter, or a block without a sort order
 * of its own that is placed with one of them.
 */
export type BrewFieldKey =
  | BrewParameterKey
  | 'bean_age'
  | 'brew_ratio'
  | 'graph'
  | 'calculated_coffee_brew_time'
  | 'calculated_extraction_yield';

/** What the layout reads from the settings. */
export interface BrewFieldSettings {
  manage_parameters: IManageBrewParameter;
  brew_order: Pick<OrderBrewParameter, 'before' | 'while' | 'after'>;
}

/** What the layout reads from the chosen preparation. */
export interface BrewFieldPreparation extends BrewFieldSettings {
  use_custom_parameters: boolean;
  style_type: PREPARATION_STYLE_TYPE;
}

/** What decides whether an entry is shown. */
interface VisibilityInput {
  /**
   * The parameters that are switched on: those of the preparation when it
   * uses custom parameters, the global ones otherwise.
   */
  parameters: IManageBrewParameter;
  customParameters: boolean;
  espresso: boolean;
}

interface BrewFieldEntry<P extends BrewParameterKey> {
  key: BrewFieldKey;
  /** The parameter whose sort order places the entry. */
  sortedAs: P;
  /** Whether the entry is shown; an entry without a rule always is. */
  visible?: (_input: VisibilityInput) => boolean;
}

/**
 * The entries a view can show, per section in the order they had in its
 * markup. That order decides between entries with the same sort order.
 */
export interface BrewFieldTable {
  before: readonly BrewFieldEntry<BeforeParameter>[];
  while: readonly BrewFieldEntry<WhileParameter>[];
  after: readonly BrewFieldEntry<AfterParameter>[];
}

/** The shown entries of each section, in the order to render them. */
export interface BrewFieldLayout {
  before: readonly BrewFieldKey[];
  while: readonly BrewFieldKey[];
  after: readonly BrewFieldKey[];
}

/** The layout while no settings or preparation are loaded yet. */
export const EMPTY_BREW_FIELD_LAYOUT: BrewFieldLayout = {
  before: [],
  while: [],
  after: [],
};

/** A parameter that is shown when it is switched on. */
function parameter<P extends BrewParameterKey>(_key: P): BrewFieldEntry<P> {
  return {
    key: _key,
    sortedAs: _key,
    visible: (_input) => _input.parameters[_key],
  };
}

/**
 * The brew graph is placed with the brew time, but stays when the brew time
 * is hidden: in the brew form it runs the brew with connected devices.
 */
const GRAPH: BrewFieldEntry<WhileParameter> = {
  key: 'graph',
  sortedAs: 'brew_time',
};

/** The brew time from the first drip on, placed with the brew time. */
const CALCULATED_COFFEE_BREW_TIME: BrewFieldEntry<WhileParameter> = {
  key: 'calculated_coffee_brew_time',
  sortedAs: 'brew_time',
  // With custom parameters the first drip time alone shows it, even when
  // the brew time is switched off.
  visible: (_input) =>
    _input.parameters.coffee_first_drip_time &&
    (_input.customParameters ||
      (_input.parameters.brew_time && _input.espresso)),
};

/**
 * The first drip time is an espresso parameter, unless a preparation
 * switches it on in its custom parameters.
 */
const COFFEE_FIRST_DRIP_TIME: BrewFieldEntry<WhileParameter> = {
  key: 'coffee_first_drip_time',
  sortedAs: 'coffee_first_drip_time',
  visible: (_input) =>
    _input.parameters.coffee_first_drip_time &&
    (_input.espresso || _input.customParameters),
};

/** Espresso has no amount of water; it is brewed by the beverage quantity. */
const BREW_QUANTITY: BrewFieldEntry<AfterParameter> = {
  key: 'brew_quantity',
  sortedAs: 'brew_quantity',
  visible: (_input) => _input.parameters.brew_quantity && !_input.espresso,
};

/** Computed from ground coffee, beverage quantity and TDS; placed with TDS. */
const CALCULATED_EXTRACTION_YIELD: BrewFieldEntry<AfterParameter> = {
  key: 'calculated_extraction_yield',
  sortedAs: 'tds',
  visible: (_input) =>
    _input.parameters.grind_weight &&
    _input.parameters.brew_beverage_quantity &&
    _input.parameters.tds,
};

/** The fields of the brew form (add, edit and repeat a brew). */
export const BREW_FORM_FIELDS: BrewFieldTable = {
  before: [
    parameter('grind_size'),
    parameter('grind_weight'),
    parameter('brew_temperature'),
    parameter('method_of_preparation'),
    parameter('bean_type'),
    parameter('mill'),
    parameter('mill_speed'),
    parameter('mill_timer'),
    parameter('pressure_profile'),
    parameter('method_of_preparation_tool'),
    parameter('water'),
    parameter('bean_weight_in'),
    parameter('vessel'),
  ],
  while: [
    parameter('brew_temperature_time'),
    GRAPH,
    parameter('brew_time'),
    CALCULATED_COFFEE_BREW_TIME,
    parameter('coffee_blooming_time'),
    COFFEE_FIRST_DRIP_TIME,
  ],
  after: [
    BREW_QUANTITY,
    parameter('coffee_type'),
    parameter('coffee_concentration'),
    parameter('rating'),
    parameter('note'),
    parameter('brew_beverage_quantity'),
    parameter('tds'),
    CALCULATED_EXTRACTION_YIELD,
    parameter('set_custom_brew_time'),
    parameter('attachments'),
  ],
};

/**
 * The fields of the brew details. They always end with the creation date,
 * which has no sort order of its own.
 */
export const BREW_DETAIL_FIELDS: BrewFieldTable = {
  before: [
    parameter('grind_size'),
    parameter('grind_weight'),
    parameter('brew_temperature'),
    parameter('method_of_preparation'),
    parameter('bean_type'),
    // Placed with the bean, but shown without it as well.
    { key: 'bean_age', sortedAs: 'bean_type' },
    { key: 'brew_ratio', sortedAs: 'bean_type' },
    parameter('mill'),
    parameter('mill_speed'),
    parameter('mill_timer'),
    parameter('pressure_profile'),
    parameter('method_of_preparation_tool'),
    parameter('bean_weight_in'),
    parameter('vessel'),
    parameter('water'),
  ],
  while: [
    parameter('brew_temperature_time'),
    GRAPH,
    parameter('brew_time'),
    CALCULATED_COFFEE_BREW_TIME,
    parameter('coffee_blooming_time'),
    COFFEE_FIRST_DRIP_TIME,
  ],
  after: [
    BREW_QUANTITY,
    parameter('coffee_type'),
    parameter('coffee_concentration'),
    parameter('rating'),
    parameter('brew_beverage_quantity'),
    parameter('tds'),
    CALCULATED_EXTRACTION_YIELD,
    parameter('note'),
    parameter('attachments'),
  ],
};

/**
 * The shown entries of `_fields` in their configured order. Like everywhere
 * else in the brew views, a preparation with custom parameters brings its
 * own switches and sort order; otherwise the global settings apply.
 */
export function brewFieldLayout(
  _fields: BrewFieldTable,
  _settings: BrewFieldSettings,
  _preparation: BrewFieldPreparation,
): BrewFieldLayout {
  const customParameters = !!_preparation.use_custom_parameters;
  const configured = customParameters ? _preparation : _settings;
  const input: VisibilityInput = {
    parameters: configured.manage_parameters,
    customParameters,
    espresso: _preparation.style_type === PREPARATION_STYLE_TYPE.ESPRESSO,
  };
  return {
    before: layoutSection(_fields.before, configured.brew_order.before, input),
    while: layoutSection(_fields.while, configured.brew_order.while, input),
    after: layoutSection(_fields.after, configured.brew_order.after, input),
  };
}

function layoutSection<P extends BrewParameterKey>(
  _entries: readonly BrewFieldEntry<P>[],
  _order: Record<P, number>,
  _input: VisibilityInput,
): BrewFieldKey[] {
  return _entries
    .map((entry, position) => ({
      entry,
      position,
      order: placementOrder(_order[entry.sortedAs]),
    }))
    .filter(({ entry }) => entry.visible === undefined || entry.visible(_input))
    .sort((a, b) => a.order - b.order || a.position - b.position)
    .map(({ entry }) => entry.key);
}

/**
 * Sort orders are whole numbers. Anything else counts as 0, a missing order
 * as well: that is where the browser left a field whose CSS `order` it could
 * not apply.
 */
function placementOrder(_value: unknown): number {
  return Number.isInteger(_value) ? (_value as number) : 0;
}
