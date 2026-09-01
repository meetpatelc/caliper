/**
 * WCAG contrast arithmetic, kept out of the browser so it can be unit-tested.
 *
 * The page-side half only has to collect colours; the judgement happens here,
 * where a wrong ratio is a failing assertion rather than a number nobody reads.
 */

/** `rgb(r, g, b)` or `rgba(r, g, b, a)` as returned by getComputedStyle. */
export function parseRgb(value) {
  const parts = String(value).match(/-?[\d.]+/g);
  if (!parts || parts.length < 3) return null;
  const [r, g, b, a] = parts.map(Number);
  return { r, g, b, a: parts.length > 3 ? a : 1 };
}

/** Composite a possibly-translucent colour over an opaque one. */
export function flatten(top, bottom) {
  if (top.a >= 1) return { r: top.r, g: top.g, b: top.b, a: 1 };
  const mix = (x, y) => x * top.a + y * (1 - top.a);
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: 1 };
}

function channel(value) {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance({ r, g, b }) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * WCAG 1.4.3: 4.5:1 for body text, 3:1 for large text — 24px, or 18.66px when
 * bold. Font weight arrives as a string from getComputedStyle.
 */
export function requiredRatio({ fontSizePx, fontWeight }) {
  const bold = Number(fontWeight) >= 700;
  const large = fontSizePx >= 24 || (bold && fontSizePx >= 18.66);
  return large ? 3 : 4.5;
}

/** Reads a sample `{color, background, fontSizePx, fontWeight}` into a verdict. */
export function judge(sample) {
  const fg = parseRgb(sample.color);
  const bg = parseRgb(sample.background);
  if (!fg || !bg) return null;
  const ratio = contrastRatio(flatten(fg, bg), bg);
  const required = requiredRatio(sample);
  return { ratio: Math.round(ratio * 100) / 100, required, passes: ratio >= required };
}
