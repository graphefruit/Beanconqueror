/**
 * The colours of a shared picture. Two take the app's own light and dark
 * colours from its theme, whatever mode the app is in; the others are fixed.
 * Every text on the picture keeps at least 4.5:1 (the tests check each one).
 */
export interface SharePalette {
  readonly id: 'caramel' | 'light' | 'dark' | 'sage';
  readonly labelKey: string;
  /**
   * The app mode the picture is drawn in: its theme colours and its graph.
   * The colours below may take the theme's through `var(--bq-…)`.
   */
  readonly mode: 'light' | 'dark';
  /** Around the card; the stamp stands on it. */
  readonly frame: string;
  readonly card: string;
  readonly text: string;
  /** Labels and the roaster. */
  readonly muted: string;
  /** Stars and the bean name. */
  readonly accent: string;
  readonly stamp: string;
}

/**
 * The axes of the graph, the secondary text of each mode. Plotly takes no
 * CSS variables, so the values are repeated; a test holds them to the theme.
 */
export const GRAPH_INK: Readonly<Record<SharePalette['mode'], string>> = {
  light: '#4a382c',
  dark: '#e1d1bf',
};

function app(mode: SharePalette['mode'], labelKey: string): SharePalette {
  return {
    id: mode,
    labelKey,
    mode,
    frame: 'var(--bq-surface-page)',
    card: 'var(--bq-surface-card)',
    text: 'var(--bq-text-primary)',
    muted: 'var(--bq-text-secondary)',
    accent: 'var(--bq-text-accent)',
    stamp: 'var(--bq-text-primary)',
  };
}

export const SHARE_PALETTES: readonly SharePalette[] = [
  {
    id: 'caramel',
    labelKey: 'SHARE_CARD.CARAMEL',
    mode: 'light',
    frame: '#825634',
    card: '#fffaf4',
    text: '#211914',
    muted: '#4a382c',
    accent: '#825634',
    stamp: '#ffffff',
  },
  app('light', 'SHARE_CARD.APP_LIGHT'),
  app('dark', 'SHARE_CARD.APP_DARK'),
  {
    id: 'sage',
    labelKey: 'SHARE_CARD.SAGE',
    mode: 'light',
    frame: '#2f5e4c',
    card: '#fbfaf6',
    text: '#211914',
    muted: '#3d4a43',
    accent: '#2f5e4c',
    stamp: '#ffffff',
  },
];

/** The picture starts in the colours of the mode the app shows. */
export function initialSharePalette(appIsDark: boolean): SharePalette {
  const mode: SharePalette['mode'] = appIsDark ? 'dark' : 'light';
  return SHARE_PALETTES.find((palette) => palette.id === mode);
}
