# Instrument

One engineering desk: **Library**, **Studio**, **Review**, and **Project**.

Open a finished model, or write your own. Units stay on the quantity. Method, assumptions, and limits sit in the same frame.

This is **not** two products. Caliper and Gauge are retired names for the same desk.

Shared look: [`packages/ui`](packages/ui) (`@instrument/ui`). Units: [`packages/units`](packages/units) (`@instrument/units`). Formula: [`packages/formula`](packages/formula).

Instrument is a **preliminary screening desk**, not a design approval, sealed calculation, or code-compliance tool. Verify every output against the geometry, loading, material, and specifications that apply to the actual project.

## Features

- Finished library models across fundamentals, mechanics, fluids, thermal, electrical, quality, automation, manufacturing, and applied systems
- Studio to author a unit-aware calculator with method attached
- SI-canonical arithmetic with declared display units
- Command palette (`⌘K` / `Ctrl+K`)
- Project snapshots and review records (no account required)
- Engineering review: checklists, weighted trade study, FMEA arithmetic
- Optional account (email + password) to sync work across devices
- Dark and light themes

## Requirements

- Node.js 22+
- npm 10+

## Quick start

```bash
git clone https://github.com/meetpatelc/instrument.git
cd instrument
npm install
npm run dev
```

The app listens on port **8080**. Open `http://localhost:8080`.

Calculators and local saves work without signing in. Copy `.env.example` to `.env.local` only if you need Postgres or other overrides.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production frontend build |
| `npm run db:migrate` | Apply SQL migrations when `DATABASE_URL` is set |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm test` | Node test runner |

## Layout

```
src/routes/          Pages (library, studio, review, project, account)
src/lib/             Catalog, documents, units, desk
src/studio/          Studio evaluator, ISO 286, authoring
src/components/      Shell, calculator workspace, diagrams
packages/ui          Shared Instrument UI kit
packages/units       Canonical SI inventory
packages/formula     Expression evaluator
migrations/          Auth + desk schema
```

## Engineering posture

- Units stay attached to every quantity.
- Assumptions are visible before a result is trusted.
- Sources and method notes remain one step away.
- A screening result is never a certification.

See **About & limits** in the app for what Instrument is and is not designed to support.

## License

[MIT](LICENSE)
