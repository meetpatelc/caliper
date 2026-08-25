# Growth opportunities

Ranked by leverage against effort. Each is grounded in what the codebase
already has, not in general advice — the point of the ordering is that the
first few are mostly unlocking work already done.

## 1. Long-tail search

169 model pages are the reason this app is worth finding. An engineer
searching "goodman fatigue" or "bolt preload torque" should land on the
model, not the home page.

Until recently every page served `<title>Instrument</title>` and there was no
sitemap, so 169 pages were effectively one. Both are fixed; what remains is
that model pages are thin.

- richer per-model copy — worked example, when to use it, when not to
- JSON-LD so results can show the relation itself
- interlink related models (`relatedTools` already computes them)

Evidence this matters: 10 of 25 common engineering queries returned nothing
in the app's own search before it was fixed. Those are the same phrases
people type into a search engine.

## 2. Shareable calculation records

Most of this exists. `resultJson` is stored, "Copy link" is built, and the
print sheet already renders inputs, method, assumptions and result.

Missing is the permanent public URL for a completed calculation. That is
simultaneously:

- the artefact an engineer files in a design folder, and
- a landing page created every time someone shares their work.

Best ratio of value to new code of anything here.

## 3. Studio drafts as a public atlas

`published` already exists on a draft, and an `/atlas` route exists. Today a
published draft still only lives on its author's account. Making published
models public is the community flywheel the product's framing implies.

Needs a moderation answer before it ships: a wrong shared calculator is worse
than no shared calculator, given what this app claims about trust.

## 4. Offline

It is a calculator for people standing next to machines. Local-first storage
already works with no account, so the gap is only:

- the app's own manifest (currently the platform's `/__grok/` one)
- a service worker covering the shell and the document chunk

## 5. Embed / read-only API

`GET /api/calc/:model?force=10kN` and an embeddable widget turn 169 models
into an integration surface for internal wikis, runbooks and reports.

Keep it read-only and rate-limited; the units contract makes the query string
unambiguous, which is exactly what most calculator APIs get wrong.
