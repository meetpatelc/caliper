# Workspace packages

Three packages, split by what they are allowed to know. The split is the point: it is what keeps a unit conversion out of the expression evaluator and a product catalog out of both.

| Package | Knows about | Deliberately does not know about |
| --- | --- | --- |
| [`formula`](formula) | expressions and numbers | units, catalogs, Studio, React |
| [`units`](units) | the canonical SI inventory and conversion | expressions, catalogs, React |
| [`ui`](ui) | tokens and presentation primitives | engineering, units, the catalog |

Nothing above may import anything below it in the product sense: `formula` takes numbers in and returns a number, callers convert with `units` first, and `ui` renders whatever it is handed.

## Consuming them

All three resolve through `file:` dependencies in the root `package.json`, so a change is picked up with no build step and no version bump.

`formula` and `ui` export TypeScript source directly. That works because Vite compiles them as part of the app — but it also means **neither is consumable outside this repo without a build step**, and both are `private: true` to say so.

`units` needs no compilation — it ships plain ESM plus hand-written `.d.ts` — so it is the one package that *could* be published as-is. It is nonetheless `private: true` like its siblings, because the `@instrument` scope is not claimed. That makes a stray `npm publish` fail safely instead of attempting to push to a scope nobody here controls.

To publish it later: claim the scope, set `private: false`, and keep the `files` allowlist so a release ships only `src/` and `data/`.

## Testing

`units` and `formula` carry their own `node --test` suites, run from the root `npm test`.

`ui` has no unit tests — it is presentation, and the things worth asserting about it are behavioural. Those live in `npm run qa:ui` (38 checks: focus restore, Escape, mobile overflow, token wiring, hydration errors) which drives a real browser against a running app. Run it after any change to `packages/ui`.

**Point it at the production preview, not the dev server:**

```bash
npm run build && npm run preview        # serves on :8081
npm run qa:ui -- http://127.0.0.1:8081
```

The dev server can report a single spurious hydration error on the very first
load after a cold start, while Vite settles its SSR and client module graphs.
It clears on the next run and does not occur in the production build, but it
makes a first dev run an unreliable signal — and hydration errors are exactly
what this check exists to catch, so it should not be run somewhere they appear
for reasons unrelated to the code.
