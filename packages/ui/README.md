# Instrument UI

Shared **Metrology** tokens and primitives for Instrument.

This is not a second product. It lives in the Instrument repo (`packages/ui`).

## Primitives

- Tokens, type, radius, focus
- Recipes: `.eyebrow` `.display-title` `.page-title` `.section-title` `.section-title-sm` `.wordmark` `.page-wrap` `.page-frame` `.lede` `.meta` `.link-quiet` `.link-accent` `.link-row` `.kbd` `.sheet-heading`
- PageHeader — room landings (eyebrow + display/page title + lede + actions)
- Button: `accent` | `outline` | `ghost` | `mark` | `destructive` — sizes `md` | `sm` | `icon`
- Field (label, hint, error, optional `required` → `aria-required` + `*`), Input, Select, Textarea
- UnitSelect (`aria-label="Unit"` unless overridden), UnitBadge, MeasurementField (fused value + unit)
- Panel (`card` | `hover`), DataRow, InstrumentSheet, QuantityName, ResultQuantity / ResultMetric
- OverlayDialog (modal + drawer, focus trap, Escape, restore focus), ConfirmDialog (`destructive` on danger)
- Menu / MenuItem (arrow-key roving, Escape, outside click, restore focus)
- SearchTrigger
- EmptyState, LoadingState (`role="status"` `aria-live="polite"`; skeletons stay `aria-hidden`), ErrorState (`text` | `banner`), SuccessState
- FilterChip (single exclusive chip), SelectableCard
- SegmentedControl / SegmentedItem — exclusive choice (`plain` nav/steps, `solid` appearance, `chip` = FilterChip)

One implementation per interaction. Product surfaces compose these; they do not restyle them.

## Spec

Paper field `#e8eaed`, DIN red `#c8102e`, IBM Plex, `rounded-md` (4px), control height `h-10`, unit column `w-unit` (`4.75rem`). No pills. Dark mode reuses the same names on `html.dark`.

## Breakpoints

- Chrome (header / drawer): `md` (768px)
- InstrumentSheet Inputs | Results: `md:grid-cols-2` (pass `columns="lg"` to keep the previous desk split)
- Compact Studio preview stays one column
- Theme: stored `instrument-theme`, else `prefers-color-scheme`
