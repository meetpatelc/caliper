# Contributing to Instrument

Thanks for helping keep this engineering desk honest and usable.

## Ground rules

1. **Do not add a calculator that cannot show its method, assumptions, and source.**
2. **Do not infer a design decision.** Results are arithmetic inside a declared boundary.
3. **Keep units explicit.** Convert through canonical SI; never hide a scale factor.
4. **Match the existing visual system.** IBM Plex, copper/graphite tokens, no ad-hoc hex in JSX.
5. **Never commit secrets**, `.env` files, or personal snapshots.

## Workflow

```bash
git checkout -b feat/short-description
npm install
npm run typecheck
npm run lint
npm test
```

1. Branch from `main`.
2. Keep the change scoped (one model family, one UX fix, or one docs pass).
3. Open a pull request with:
   - What changed and why
   - How you verified it (example inputs + expected output for any formula change)
   - Screenshots for UI changes (desktop and ~390px)

## Adding or changing a model

Most models are **documents**: data, not code. You declare fields, output
expressions, method, assumptions, and source, and the shared evaluator runs it
(`runLibraryDocument`). Write custom TypeScript only for a model the document
schema cannot express yet — branching case tables, iterative solves, and the
like.

A released tool must have all of:

| Piece | Where |
| --- | --- |
| `ToolId` union member | `src/lib/catalog.ts` |
| Catalog entry (title, assumptions, source, contract) | `tools` in `src/lib/catalog.ts` |
| Search aliases | `toolAliases` in `src/lib/catalog.ts` |
| Field definitions | `toolFields` in `src/lib/engineering.ts` |
| Example inputs | `initialInputs` in `src/lib/engineering.ts` |
| The document (fields, expressions, method, source) | one of `src/lib/library-*.ts` |

The last three `Record<ToolId, …>` maps are exhaustive over `ToolId`, so
`npm run typecheck` tells you what you missed.

Two things the old version of this file got wrong, worth stating plainly:

- **You do not add a `calculateTool` branch.** Documents are dispatched by
  `toolId in libraryDocuments`. A branch there is only for a custom TypeScript
  model.
- **Diagrams live in `src/components/sketches.tsx`** (`MechanicalDiagram` is a
  thin wrapper around it) and are **optional** — most released models have none.
  Add one when the geometry is load-bearing for reading the result.

Field definitions currently duplicate what the document already declares. That
is migration debt, not a design goal; keep the two in agreement until they are
unified.

If you add a model, also:

- Keep `MODEL_COUNT` derived from `tools.length` (never hardcode the count).
- Hand-check the default example against a trusted source and paste that check in the PR.
- State the formula version and what would invalidate the method.

## Code style

- TypeScript strict. No `any` unless a third-party type forces it.
- Prefer existing tokens and components over new primitives.
- Run `npm run format` before you push if you touched formatting-sensitive files.

## Review checklist (for authors)

- [ ] Typecheck passes
- [ ] Default example calculates without errors
- [ ] Unknown or invalid input returns a visible error, not a silent fallback
- [ ] Mobile (~390px) does not overflow
- [ ] No secrets in the diff

## License

By contributing, you agree that your work is licensed under the MIT License.
