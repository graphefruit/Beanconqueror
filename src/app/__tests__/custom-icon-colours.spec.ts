import { beanconquerorIcons } from '../../generated/icon-registry';

/**
 * The icon colour is cream in dark mode, where a fixed white glyph on it
 * would fade (1.38:1). Glyphs drawn on it take the glyph colour instead.
 * beanconqueror-dashboard-add-fill is the inverse (disc white, plus in the
 * icon colour); its disc takes the glyph colour for the same reason.
 */
describe('Custom icon colours', () => {
  // As attribute (fill="#fff") or inline style (fill:rgb(100%,100%,100%)).
  const fixedWhite =
    /\b(?:fill|stroke)\s*[:=]\s*"?(?:#fff(?:fff)?|white|rgb\((?:\s*(?:255|100%)\s*,?){3}\))(?![\w-])/i;

  it('draws no fixed white on the icon colour', async () => {
    const offenders: string[] = [];
    for (const icon of beanconquerorIcons) {
      const response = await fetch(`/assets/custom-ion-icons/${icon.path}`);
      expect(response.ok).withContext(icon.path).toBeTrue();
      const svg = await response.text();
      if (
        svg.includes('var(--beanconqueror-icon-color)') &&
        fixedWhite.test(svg)
      ) {
        offenders.push(icon.path);
      }
    }
    expect(offenders).toEqual([]);
  });
});
