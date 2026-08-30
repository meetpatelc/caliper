import assert from "node:assert/strict";
import test from "node:test";
import { computeFit } from "@/studio/lib/iso286";
import { outcomes } from "@/studio/lib/iso286-outcomes";

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
  // These two were ⌀450 H7/s6 and ⌀500 H12/u8, chosen to exercise the
  // interference side at the top of the range. R, S and U now refuse above
  // 50 mm — the table has one value per coarse band and ISO 286 splits theirs
  // there — so the interference cases move to a size s6 is tabulated for, and
  // to p6, which the standard does not sub-divide.
  [40, "H", 7, "s", 6],
  [3, "H", 11, "c", 11],
  [450, "H", 7, "p", 6],
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

/**
 * The caption under each result prints the subtraction that produced it. The
 * bug this pins was live for one build: naming the outcome by its sign but
 * keeping the original terms, so a clearance fit rendered
 *
 *   Tightest — clearance   0.012 mm   es − EI = (-12) − 0 = 12 µm
 *
 * which does not add up. Both halves have to flip together — on a clearance
 * fit the tightest outcome is EI − es, not the negation of es − EI. Arithmetic
 * that fails on inspection is the worst possible defect on the one page whose
 * argument is that you can inspect it.
 */
test("every caption's subtraction produces the number beside it", () => {
  for (const [D, hl, hg, sl, sg] of CASES) {
    const fit = computeFit(D, hl, hg, sl, sg);
    for (const outcome of outcomes(fit)) {
      // "ES − ei = 35 − (-34)" -> the operands actually shown
      const shown = outcome.working.split(" = ")[1];
      const [left, right] = shown.split(" − ").map((/** @type {string} */ part) => Number(part.replace(/[()]/g, "")));
      const where = `⌀${D} ${hl}${hg}/${sl}${sg} ${outcome.label}`;
      assert.equal(
        left - right,
        outcome.magnitude,
        `${where}: "${shown}" must equal the ${outcome.magnitude} µm printed beside it`,
      );
      assert.ok(outcome.magnitude >= 0, `${where}: a printed gap or squeeze is never negative`);
      assert.equal(um(outcome.mmValue), outcome.magnitude, `${where}: mm and µm must agree`);
    }
  }
});
