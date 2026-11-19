export type Rgb = [number, number, number];

/**
 * The first colour in a computed value, e.g. of a background or box-shadow.
 * A translucent colour is laid over `behind` when given, as it is drawn.
 */
export function firstColour(value: string, behind?: Rgb): Rgb {
  const match = /rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?/.exec(value);
  if (!match) throw new Error(`no colour in "${value}"`);
  const rgb: Rgb = [Number(match[1]), Number(match[2]), Number(match[3])];
  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  if (!behind || alpha === 1) return rgb;
  return rgb.map((channel, i) =>
    Math.round(channel * alpha + behind[i] * (1 - alpha)),
  ) as Rgb;
}

/** WCAG contrast ratio of two opaque colours. */
export function contrast(a: Rgb, b: Rgb): number {
  const luminance = (rgb: Rgb) => {
    const [r, g, b] = rgb.map((channel) => {
      const c = channel / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}
