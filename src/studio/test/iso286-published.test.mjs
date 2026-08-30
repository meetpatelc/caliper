import assert from "node:assert/strict";
import test from "node:test";
import { computeFit } from "@/studio/lib/iso286";

/**
 * Limits as published in ISO 286-2, in µm, across three size bands.
 *
 * The suite previously held one ISO case — computeFit(100,"H",9,"n",8) — and
 * asserted only that the limits "stay distinct". Both are general-rule classes,
 * so nothing exercised the Δ rule, and a property that nothing violates cannot
 * fail. Every K/M/N/P value below was wrong before this change.
 */
const HOLE_CASES = [
  // ⌀18–30 band, checked at 25 mm
  { D: 25, letter: "H", grade: 7, ES: 21, EI: 0 },
  { D: 25, letter: "K", grade: 7, ES: 6, EI: -15 },
  { D: 25, letter: "N", grade: 7, ES: -7, EI: -28 },
  { D: 25, letter: "P", grade: 7, ES: -14, EI: -35 },

  // ⌀30–50 band, checked at 50 mm
  { D: 50, letter: "H", grade: 7, ES: 25, EI: 0 },
  { D: 50, letter: "K", grade: 7, ES: 7, EI: -18 },
  { D: 50, letter: "M", grade: 7, ES: 0, EI: -25 },
  { D: 50, letter: "N", grade: 7, ES: -8, EI: -33 },

  // ⌀80–120 band, checked at 100 mm
  { D: 100, letter: "H", grade: 7, ES: 35, EI: 0 },
  { D: 100, letter: "K", grade: 7, ES: 10, EI: -25 },
  { D: 100, letter: "M", grade: 7, ES: 0, EI: -35 },
  { D: 100, letter: "N", grade: 7, ES: -10, EI: -45 },
  { D: 100, letter: "P", grade: 7, ES: -24, EI: -59 },
];

for (const c of HOLE_CASES) {
  test(`hole ⌀${c.D} ${c.letter}${c.grade} matches published limits`, () => {
    // Paired against h6 so the hole side is what is under test.
    const fit = computeFit(c.D, /** @type {any} */ (c.letter), c.grade, "h", 6);
    assert.equal(Math.round(fit.ES * 1000), c.ES, `ES for ${c.letter}${c.grade} at ⌀${c.D}`);
    assert.equal(Math.round(fit.EI * 1000), c.EI, `EI for ${c.letter}${c.grade} at ⌀${c.D}`);
  });
}

// Above its threshold a class returns to the general rule, so this pins the
// boundary rather than only the special case.
// The threshold itself, asserted structurally rather than against a value:
// N8 is inside the Δ rule and N9 is outside it, so N9 must land exactly on −FD
// and N8 must not. Stating a published figure for N8 here would mean quoting a
// table I cannot check, which is the habit that produced the original bug.
test("the delta rule stops at the grade threshold", () => {
  const FD_n_80_120 = 23;
  const n8 = computeFit(100, "N", 8, "h", 6);
  const n9 = computeFit(100, "N", 9, "h", 6);
  assert.equal(Math.round(n9.ES * 1000), -FD_n_80_120, "N9 is the general rule: ES = -FD");
  assert.notEqual(Math.round(n8.ES * 1000), -FD_n_80_120, "N8 is inside the delta rule");
  assert.ok(Math.round(n8.ES * 1000) > -FD_n_80_120, "delta moves ES up, never down");
});

test("clearance letters are unaffected by the delta rule", () => {
  const h7 = computeFit(100, "H", 7, "h", 6);
  assert.equal(Math.round(h7.ES * 1000), 35);
  assert.equal(Math.round(h7.EI * 1000), 0);
  const f8 = computeFit(100, "F", 8, "h", 6);
  assert.equal(Math.round(f8.EI * 1000), 36);
});

/**
 * R, S and U stop at 50 mm, because above it the table cannot be right.
 *
 * `SIZE_LIMITS` has one band from 50 to 80 and `FD` carries one value per band.
 * ISO 286 splits the ranges for r, s and u above 50 mm — 50–65, 65–80, 80–100,
 * and so on — so a single figure cannot serve both halves of a split, and there
 * is no way to tell from inside the table which half it belongs to.
 *
 * Nothing exercised these letters at all, so the table answered confidently for
 * sizes it has no entry for. A fit is something somebody presses a bearing
 * onto; refusing is the only honest answer until the sub-divided rows are
 * transcribed from ISO 286-2 and checked.
 */
test("R, S and U refuse above 50 mm rather than answer from a coarse band", () => {
  for (const letter of /** @type {const} */ (["r", "s", "u"])) {
    assert.doesNotThrow(
      () => computeFit(40, "H", 7, letter, 6),
      `${letter} at 40 mm is inside the tabulated range`,
    );
    assert.throws(
      () => computeFit(100, "H", 7, letter, 6),
      /only tabulated here up to 50 mm/,
      `${letter} at 100 mm must refuse`,
    );
    // The hole letter routes through the same table by mirroring the shaft.
    assert.throws(
      () => computeFit(100, /** @type {any} */ (letter.toUpperCase()), 7, "h", 6),
      /only tabulated here up to 50 mm/,
      `${letter.toUpperCase()} as a hole must refuse too`,
    );
  }
});

test("the letters ISO 286 does not sub-divide are unaffected", () => {
  // The guard must be narrow: p, n and the clearance letters have one value per
  // coarse band in the standard as well, so refusing them would be wrong.
  for (const letter of /** @type {const} */ (["c", "d", "e", "f", "g", "h", "k", "m", "n", "p"])) {
    assert.doesNotThrow(() => computeFit(400, "H", 7, letter, 6), `${letter} at 400 mm must still answer`);
  }
});
