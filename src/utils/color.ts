/** Relative luminance (WCAG) of a `#RRGGBB` string. */
export function luminance(hex: string): number {
  const parse = (s: string) => parseInt(s, 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const r = toLinear(parse(hex.slice(1, 3)));
  const g = toLinear(parse(hex.slice(3, 5)));
  const b = toLinear(parse(hex.slice(5, 7)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** True when dark text should be used over `hex`. */
export function isLightColor(hex: string): boolean {
  return luminance(hex) > 0.42;
}
