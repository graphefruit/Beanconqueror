/**
 * The colours of a shared picture. They are fixed rather than free, so every
 * text on the picture keeps at least 4.5:1 (the test checks each one), and
 * they do not follow the app's light or dark mode.
 */
export interface SharePalette {
  readonly id: 'caramel' | 'cream' | 'espresso' | 'sage';
  readonly labelKey: string;
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

export const SHARE_PALETTES: readonly SharePalette[] = [
  {
    id: 'caramel',
    labelKey: 'SHARE_CARD.CARAMEL',
    frame: '#825634',
    card: '#fffaf4',
    text: '#211914',
    muted: '#4a382c',
    accent: '#825634',
    stamp: '#ffffff',
  },
  {
    id: 'cream',
    labelKey: 'SHARE_CARD.CREAM',
    frame: '#ead9c4',
    card: '#fffaf4',
    text: '#211914',
    muted: '#4a382c',
    accent: '#9e2d45',
    stamp: '#211914',
  },
  {
    id: 'espresso',
    labelKey: 'SHARE_CARD.ESPRESSO',
    frame: '#211914',
    card: '#2a211a',
    text: '#f5ebdd',
    muted: '#e1d1bf',
    accent: '#e0a87a',
    stamp: '#ead9c4',
  },
  {
    id: 'sage',
    labelKey: 'SHARE_CARD.SAGE',
    frame: '#2f5e4c',
    card: '#fbfaf6',
    text: '#211914',
    muted: '#3d4a43',
    accent: '#2f5e4c',
    stamp: '#ffffff',
  },
];
