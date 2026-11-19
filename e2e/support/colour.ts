export type Rgb = [number, number, number];

/** The first colour in a computed value, e.g. of a background or box-shadow. */
export function firstColour(value: string): Rgb {
  const match = /rgba?\((\d+), (\d+), (\d+)/.exec(value);
  if (!match) throw new Error(`no colour in "${value}"`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
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
