import assert from "node:assert/strict";
import test from "node:test";
import { computeFit } from "@/studio/lib/iso286";

/**
 * The ISO 286 page prints the subtraction behind each result. The risk that
 * introduces is not a wrong tolerance — the deviations come from the published
 * table either way — but a wrong *sum*: operands displayed that do not produce
 * the answer beside them. On a page whose argument is "check this yourself",
 * that is the worst available bug.
 *
 * These identities were pinned while the page existed as a second view at
 * /lab/iso-286 for comparison. That page is gone; the working now ships on
 * /tool/fits and the guard travels with it.
 *
 * So this pins the four identities the page renders, across the range and both
 * ends of it, against the values `computeFit` returns.
 */

/** @param {number} mmValue */
const um = (mmValue) => Math.round(mmValue * 1000);

/** @type {[number, import("@/studio/lib/iso286").HoleLetter, number, import("@/studio/lib/iso286").ShaftLetter, number][]} */
const CASES = [
  [25, "H", 7, "g", 6],
  [100, "H", 9, "n", 8],
  [100, "H", 7, "g", 6],
  [100, "N", 7, "h", 6],
  [2, "H", 8, "f", 7],
  [450, "H", 7, "s", 6],
  [3, "H", 11, "c", 11],
  [500, "H", 12, "u", 8],
];

test("the working shown reproduces the fit it is shown beside", () => {
  for (const [D, hl, hg, sl, sg] of CASES) {
    const fit = computeFit(D, hl, hg, sl, sg);
    const ES = um(fit.ES);
    const EI = um(fit.EI);
    const es = um(fit.es);
    const ei = um(fit.ei);
    const where = `⌀${D} ${hl}${hg}/${sl}${sg}`;

    assert.equal(ES - ei, um(fit.cmax), `${where}: largest clearance must be ES − ei`);
    assert.equal(EI - es, um(fit.cmin), `${where}: smallest clearance must be EI − es`);
    assert.equal(es - EI, um(fit.imax), `${where}: largest interference must be es − EI`);
    assert.equal(ei - ES, um(fit.imin), `${where}: smallest interference must be ei − ES`);
  }
});

test("the published widths are the ones the page prints", () => {
  const a = computeFit(100, "H", 9, "n", 8);
  assert.equal(a.IT_hole, 87, "IT9 at ⌀100 is 87 µm in the published table");
  assert.equal(a.IT_shaft, 54, "IT8 at ⌀100 is 54 µm in the published table");
});

test("a clearance fit still has a meaningful smallest clearance", () => {
  // The page used to show only the maxima, so a clearance fit reported a
  // negative "maximum interference" and hid the number a reader wants. This is
  // the case that motivated showing all four.
  const fit = computeFit(100, "H", 7, "g", 6);
  assert.equal(fit.kind, "clearance");
  assert.ok(um(fit.imax) < 0, "interference on a clearance fit is negative, which reads as a fault");
  assert.equal(um(fit.cmin), 12, "the useful number is the smallest clearance");
  assert.equal(um(fit.cmax), 69);
});
