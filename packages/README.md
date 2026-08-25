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

`units` is the exception: it ships plain ESM plus hand-written `.d.ts`, so it needs no compilation and is marked publishable. `files` limits what a publish would actually include.

> ⚠️ `units` is the only package with `private: false`, which means `npm publish` in that directory would push to the public registry under the `@instrument` scope. If that scope is not yours, either claim it or set `private: true`. The asymmetry looks deliberate, so it has been left as it is rather than changed silently.

## Testing

`units` and `formula` carry their own `node --test` suites, run from the root `npm test`.

`ui` has no unit tests — it is presentation, and the things worth asserting about it are behavioural. Those live in `npm run qa:ui` (38 checks: focus restore, Escape, mobile overflow, token wiring, hydration errors) which drives a real browser against a running app. Run it after any change to `packages/ui`.
