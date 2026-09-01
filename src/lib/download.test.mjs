import assert from "node:assert/strict";
import test from "node:test";
import { fileSlug } from "./download.ts";

test("an ordinary title becomes an ordinary filename", () => {
  assert.equal(fileSlug("Evidence review", "review"), "evidence-review");
  assert.equal(fileSlug("Q3 Bracket — Rev B", "review"), "q3-bracket-rev-b");
});

test("a title with nothing usable in it falls back", () => {
  // The version this replaces wrote `title.replace(/[^a-z0-9]+/g, "-") || "review"`,
  // and "!!!" replaces to "-", which is truthy — so the fallback never fired
  // and the file was called "--report.md".
  assert.equal(fileSlug("!!!", "review"), "review");
  assert.equal(fileSlug("", "review"), "review");
  assert.equal(fileSlug("   ", "review"), "review");
});

test("no leading or trailing separators", () => {
  assert.equal(fileSlug("  spaced  ", "review"), "spaced");
  assert.equal(fileSlug("(draft) plan", "review"), "draft-plan");
});
