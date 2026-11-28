import { IGraphColors } from '../interfaces/settings/iGraphColors';

// Every line stands out by 3:1 at least from the card it is drawn on (white /
// #2a211a). On white the live lines keep 4.5:1 and are the darker ones; a
// reference line is told apart by its dash, not by its colour alone.
export const DEFAULT_GRAPH_COLORS = {
  weight: {
    active: { light: '#857450', dark: '#8b7e6a' },
    reference: { light: '#a0907a', dark: '#ebe6dd' },
  },
  weightSecond: {
    active: { light: '#8F6400', dark: '#926600' },
    reference: { light: '#ae914b', dark: '#b0924c' },
  },
  flowPerSecond: {
    active: { light: '#617a85', dark: '#7F97A2' },
    reference: { light: '#8e9598', dark: '#cbd5d9' },
  },
  realtimeFlow: {
    active: { light: '#09485D', dark: '#0f7597' },
    reference: { light: '#7799a6', dark: '#9cb5be' },
  },
  realtimeFlowSecond: {
    active: { light: '#107fa5', dark: '#1FB6EA' },
    reference: { light: '#149fd0', dark: '#62cbf0' },
  },
  pressure: {
    active: { light: '#038663', dark: '#05C793' },
    reference: { light: '#27a784', dark: '#9be8d3' },
  },
  temperature: {
    active: { light: '#CC3311', dark: '#CC3311' },
    reference: { light: '#dd7962', dark: '#eaad9f' },
  },
  waterDispensed: {
    active: { light: '#0d6efd', dark: '#3b82f6' },
    reference: { light: '#4a94fd', dark: '#86b7fe' },
  },
  waterDispensedFlowSecond: {
    active: { light: '#008080', dark: '#3fd0c9' },
    reference: { light: '#33a3a3', dark: '#99d9e4' },
  },
  customTrace: {
    active: { light: '#000000', dark: '#ffffff' },
    reference: { light: '#808080', dark: '#808080' },
  },
};

/** The defaults before they reached 3:1, by series, kind and mode. */
const FORMER_DEFAULTS: Record<string, string> = {
  'weight.active.light': '#cdc2ac',
  'weight.reference.light': '#ebe6dd',
  'weightSecond.active.dark': '#8F6400',
  'weightSecond.reference.light': '#b0924c',
  'flowPerSecond.active.light': '#7F97A2',
  'flowPerSecond.reference.light': '#cbd5d9',
  'realtimeFlow.active.dark': '#09485D',
  'realtimeFlow.reference.light': '#9cb5be',
  'realtimeFlowSecond.active.light': '#1FB6EA',
  'realtimeFlowSecond.reference.light': '#62cbf0',
  'pressure.active.light': '#05C793',
  'pressure.reference.light': '#9be8d3',
  'temperature.reference.light': '#eaad9f',
  'waterDispensed.reference.light': '#b6d4fe',
  'waterDispensedFlowSecond.active.light': '#17a2b8',
  'waterDispensedFlowSecond.active.dark': '#17a2b8',
  'waterDispensedFlowSecond.reference.light': '#99d9e4',
};

/**
 * Moves every colour still at a former default to the current one. Settings
 * keep all colours, chosen or not, so only an exact former default counts as
 * not chosen; any other colour stays.
 */
export function replaceFormerDefaults(colors: IGraphColors): void {
  for (const [path, former] of Object.entries(FORMER_DEFAULTS)) {
    const [series, kind, mode] = path.split('.') as [
      keyof IGraphColors,
      'active' | 'reference',
      'light' | 'dark',
    ];
    const pair = colors[series]?.[kind];
    const stored: unknown = pair?.[mode];
    // A hand-edited backup may hold anything here.
    if (
      typeof stored === 'string' &&
      stored.toLowerCase() === former.toLowerCase()
    ) {
      pair[mode] = DEFAULT_GRAPH_COLORS[series][kind][mode];
    }
  }
}
