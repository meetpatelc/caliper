/**
 * The icon scale.
 *
 * Icon sizes were previously chosen per call site — seven distinct values
 * across the app, including 13, 14 and 15, which no reader perceives as
 * intentional but which stop icons sharing an optical weight.
 *
 * Three sizes cover every use here. Import the name, never the number, so a
 * future change is one edit rather than a search.
 */
export const ICON = {
  /** Sits inline with body text, or inside a `size="sm"` control. */
  inline: 14,
  /** Default — standalone icons, buttons, list markers. */
  base: 16,
  /** Emphasis: an icon that is the subject rather than a label's companion. */
  lead: 20,
} as const;

export type IconSize = (typeof ICON)[keyof typeof ICON];
