type Rgb = [number, number, number];

function parse(colour: string): Rgb | undefined {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(colour.trim());
  if (!match) {
    return undefined;
  }
  const hex = match[1].length === 3 ? match[1].replace(/./g, '$&$&') : match[1];
  const value = Number.parseInt(hex, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** WCAG contrast of two `#rgb`/`#rrggbb` colours; NaN for any other. */
export function contrastRatio(a: string, b: string): number {
  const [x, y] = [parse(a), parse(b)];
  return x && y ? ratio(x, y) : Number.NaN;
}

/**
 * A graph line that stands out from `ground` by `min` at least: mixed towards
 * black on a light ground, white on a dark one, only as far as needed, so the
 * line keeps its hue. A colour that is not hex is left as it is.
 */
export function readableLine(colour: string, ground: string, min = 3): string {
  const [line, under] = [parse(colour), parse(ground)];
  if (!line || !under || ratio(line, under) >= min) {
    return colour;
  }
  const towards =
    ratio(under, [0, 0, 0]) > ratio(under, [255, 255, 255]) ? 0 : 255;
  let mixed = line;
  for (let step = 1; step <= 20 && ratio(mixed, under) < min; step++) {
    mixed = line.map((channel) =>
      Math.round(channel + (towards - channel) * (step / 20)),
    ) as Rgb;
  }
  return '#' + mixed.map((c) => c.toString(16).padStart(2, '0')).join('');
}
