# Archive

Parked code. Not loaded by the app.

Do not delete until Instrument is stable. Restore by moving a file back onto the same path under `src/` or `scripts/`.

| Parked | Why |
| --- | --- |
| `src/routes/atlas.tsx` | Second catalog. Live `/atlas` now redirects to Library. |
| `src/components/MethodBrief.tsx` | Replaced by `InstrumentMethod`. |
| `src/lib/toolBriefs.ts` | Only served MethodBrief. |
| `src/lib/caliper-models.ts` | Empty. Models live on `InstrumentDocument`. |
| `src/lib/caliper-runner.ts` | Runner for the empty map. |
| `src/gauge/components/sketches.tsx` | Unused Gauge sketch set. Library uses `ToolSketch`. |
| `src/gauge/lib/units.ts` | Unused Gauge unit adapter. Kit is `@/lib/units`. |
| `scripts/promote-band1.mjs` | One-shot. Already wrote `library-band1.ts`. |
| `scripts/promote-leftovers.mjs` | One-shot. Already wrote `library-leftovers.ts`. |
