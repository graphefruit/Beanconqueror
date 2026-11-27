import { contrastRatio, readableLine } from '../line-contrast';

describe('line contrast', () => {
  it('measures as WCAG does', () => {
    expect(contrastRatio('#000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
    expect(contrastRatio('red', '#ffffff')).toBeNaN();
    // A computed ground, alpha left out.
    expect(
      contrastRatio('rgb(0, 0, 0)', 'rgba(255, 255, 255, 0.5)'),
    ).toBeCloseTo(21, 5);
  });

  it('leaves a line that already reads as it is', () => {
    expect(readableLine('#CC3311', '#ffffff')).toBe('#CC3311');
    expect(readableLine('rgb(1, 2, 3)', '#ffffff')).toBe('rgb(1, 2, 3)');
  });

  it('darkens a faint line on a light ground just enough', () => {
    const line = readableLine('#cdc2ac', '#fbfaf6');
    expect(contrastRatio(line, '#fbfaf6')).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(line, '#fbfaf6')).toBeLessThan(3.6);
    // Still the same warm hue: red above green above blue.
    const [r, g, b] = [1, 3, 5].map((i) =>
      Number.parseInt(line.slice(i, i + 2), 16),
    );
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
  });

  it('lightens a dark line on a dark ground', () => {
    const line = readableLine('#09485D', '#2a211a');
    expect(contrastRatio('#09485D', '#2a211a')).toBeLessThan(3);
    expect(contrastRatio(line, '#2a211a')).toBeGreaterThanOrEqual(3);
  });
});
