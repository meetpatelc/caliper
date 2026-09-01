import assert from "node:assert/strict";
import test from "node:test";
import { FITS_DEFAULT, fitsFromSearch, fitsToSearch } from "../lib/fits-url.ts";

const allowed = { hole: ["H", "K", "M", "N", "P"], shaft: ["h", "n", "p", "s", "u"], grades: [6, 7, 8, 9, 10] };

test("a full URL comes back as the state that made it", () => {
  const state = { diameter: "63", holeLetter: "H", holeGrade: 7, shaftLetter: "p", shaftGrade: 6 };
  assert.deepEqual(fitsFromSearch(fitsToSearch(state), allowed), state);
});

test("an empty URL is the default fit, not an error", () => {
  assert.deepEqual(fitsFromSearch({}, allowed), FITS_DEFAULT);
});

test("nonsense in any field falls back to that field's default and keeps the rest", () => {
  // These arrive from a URL somebody may have typed, truncated, or copied out
  // of a chat client that ate the last character. Throwing would blank a page
  // that could still have shown four correct fields.
  const state = fitsFromSearch(
    { d: "not-a-number", hole: "Q", holeIt: "99", shaft: "p", shaftIt: "6" },
    allowed,
  );
  assert.equal(state.diameter, FITS_DEFAULT.diameter);
  assert.equal(state.holeLetter, FITS_DEFAULT.holeLetter);
  assert.equal(state.holeGrade, FITS_DEFAULT.holeGrade);
  assert.equal(state.shaftLetter, "p");
  assert.equal(state.shaftGrade, 6);
});

test("a letter of the wrong case is not quietly accepted", () => {
  // "h" is a shaft, "H" is a hole. Coercing between them would silently answer
  // a different question than the URL asked.
  assert.equal(fitsFromSearch({ hole: "h" }, allowed).holeLetter, FITS_DEFAULT.holeLetter);
  assert.equal(fitsFromSearch({ shaft: "H" }, allowed).shaftLetter, FITS_DEFAULT.shaftLetter);
});

test("the diameter is not reformatted on the way through", () => {
  // Someone typed "63.500". Rounding it to "63.5" on load edits their input in
  // front of them for no reason.
  assert.equal(fitsFromSearch({ d: "63.500" }, allowed).diameter, "63.500");
  assert.equal(fitsFromSearch({ d: " 63.5 " }, allowed).diameter, "63.5");
});

test("a non-integer grade is rejected rather than truncated", () => {
  assert.equal(fitsFromSearch({ holeIt: "7.5" }, allowed).holeGrade, FITS_DEFAULT.holeGrade);
});
