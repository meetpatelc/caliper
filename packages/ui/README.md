# Instrument UI

Shared **Metrology** tokens and primitives for Instrument.

This is not a second product. It lives in the Instrument repo (`packages/ui`).

## Primitives

- Tokens, type, radius, focus
- Recipes: `.eyebrow` `.display-title` `.page-title` `.section-title` `.section-title-sm` `.wordmark` `.page-wrap` `.page-frame` `.lede` `.meta` `.link-quiet` `.link-accent` `.link-row` `.kbd` `.sheet-heading`
- PageHeader — room landings (eyebrow + display/page title + lede + actions)
- Button, Field (label, hint, error + ARIA), Input, Select, Textarea
- UnitSelect, UnitBadge, MeasurementField (fused value + unit)
- Panel, DataRow, InstrumentSheet, QuantityName, ResultQuantity / ResultMetric
- OverlayDialog (modal + drawer, focus trap, Escape, restore focus), ConfirmDialog
- Menu / MenuItem (arrow-key roving, Escape, outside click)
- SearchTrigger
- EmptyState, LoadingState, ErrorState (`text` | `banner`), SuccessState
- FilterChip (single exclusive chip), SelectableCard
- SegmentedControl / SegmentedItem — exclusive choice (`plain` nav/steps, `solid` appearance, `chip` = FilterChip)

One implementation per interaction. Product surfaces compose these; they do not restyle them.

## Spec

Paper field `#e8eaed`, DIN red `#c8102e`, IBM Plex, `rounded-md` (4px), control height `h-10`, unit column `w-unit`. No pills. Dark mode reuses the same names on `html.dark`.
