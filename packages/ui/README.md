# Instrument UI

Shared **Metrology** tokens and primitives for Instrument.

This is not a second product. It lives in the Instrument repo (`packages/ui`).

## Primitives

- Tokens, type, radius, focus, Button, Field, Input, Select, Textarea
- UnitSelect, UnitBadge, MeasurementField (fused value + unit)
- Panel, InstrumentSheet, QuantityName, ResultQuantity / ResultMetric
- OverlayDialog (modal + drawer)
- EmptyState, LoadingState, ErrorState
- FilterChip, SelectableCard

## Spec

Paper field `#e8eaed`, DIN red `#c8102e`, IBM Plex, `rounded-md` (4px), control height `h-10`, unit column `w-unit`. No pills. Dark mode reuses the same names on `html.dark`.
