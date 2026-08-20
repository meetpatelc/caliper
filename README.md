# Caliper

Local-first engineering workspace. **166** unit-aware calculators with the method, assumptions, and source in the same frame as the result.

Caliper is a **preliminary screening desk**, not a design approval, sealed calculation, or code-compliance tool. Verify every output against the geometry, loading, material, and specifications that apply to the actual project.

## Features

- 166 released models across fundamentals, mechanics, fluids, thermal, electrical, quality, automation, manufacturing, and applied systems
- SI-canonical arithmetic with declared display units
- Command palette (`⌘K` / `Ctrl+K`) with substring search
- Local project snapshots and review records (no account required)
- Engineering review: checklists, weighted trade study, FMEA arithmetic
- Optional Google / X sign-in
- Dark and light themes

## Requirements

- Node.js 22+
- npm 10+

## Quick start

```bash
git clone https://github.com/meetpatelc/caliper.git
cd caliper
npm install
npm run dev
```

The app listens on port **8080**. Open `http://localhost:8080`.

Calculators and local saves work without signing in. Copy `.env.example` to `.env.local` only if you need Postgres or other overrides.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm test` | Node test runner for `scripts/**/*.test.mjs` |

## Project layout

```
src/routes/          Pages (desk, library, tool, review, projects, methods)
src/lib/catalog.ts   Tool metadata, aliases, sources
src/lib/engineering.ts  Field definitions and calculateTool
src/lib/units.ts     Unit families and SI conversion
src/components/      Shell, calculator workspace, diagrams, command palette
migrations/          Auth + feedback schema
```

## Engineering posture

- Units stay attached to every quantity.
- Assumptions are visible before a result is trusted.
- Sources and method notes remain one step away.
- A screening result is never a certification.

See **About & limits** in the app for what Caliper is and is not designed to support.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Security

See [SECURITY.md](SECURITY.md) to report a vulnerability. Do not open a public issue for secrets or exploitable bugs.

## License

[MIT](LICENSE)
