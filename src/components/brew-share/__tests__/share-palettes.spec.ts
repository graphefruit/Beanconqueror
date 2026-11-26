import { contrast, Rgb } from '../../../../e2e/support/colour';
import { GRAPH_INK, SHARE_PALETTES } from '../share-palettes';

function rgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

describe('share palettes', () => {
  it('are the four fixed colours, each with its own name', () => {
    expect(SHARE_PALETTES.map((palette) => palette.id)).toEqual([
      'caramel',
      'cream',
      'espresso',
      'sage',
    ]);
    expect(new Set(SHARE_PALETTES.map((p) => p.labelKey)).size).toBe(4);
  });

  for (const palette of SHARE_PALETTES) {
    it(`keep every text at 4.5:1 at least (${palette.id})`, () => {
      for (const colour of [palette.text, palette.muted, palette.accent]) {
        expect(contrast(rgb(colour), rgb(palette.card)))
          .withContext(`${colour} on ${palette.card}`)
          .toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(rgb(palette.stamp), rgb(palette.frame)))
        .withContext(`stamp ${palette.stamp} on ${palette.frame}`)
        .toBeGreaterThanOrEqual(4.5);
    });

    it(`draw the graph to suit the card, its axes at 4.5:1 (${palette.id})`, () => {
      const white = contrast(rgb(palette.card), [255, 255, 255]);
      const black = contrast(rgb(palette.card), [0, 0, 0]);
      expect(palette.graph).toBe(white > black ? 'dark' : 'light');
      expect(contrast(rgb(GRAPH_INK[palette.graph]), rgb(palette.card)))
        .withContext(`axes on ${palette.card}`)
        .toBeGreaterThanOrEqual(4.5);
    });
  }
});
