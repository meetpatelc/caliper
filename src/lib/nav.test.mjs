import assert from "node:assert/strict";
import test from "node:test";
import { navCurrent, PRIMARY_NAV } from "./nav.ts";

/** @param {string} label */
const item = (label) => {
  const found = PRIMARY_NAV.find((entry) => entry.label === label);
  if (!found) throw new Error(`no primary nav item labelled ${label}`);
  return found;
};

test("a link to the page you are on is the current page", () => {
  assert.equal(navCurrent(item("Library"), "/"), "page");
  assert.equal(navCurrent(item("Review"), "/review"), "page");
  assert.equal(navCurrent(item("Project"), "/workshop"), "page");
});

test("a section containing the page is current, but is not the page", () => {
  // The bug: `match` is broad on purpose so the highlight marks the section,
  // and that flag was spelled `aria-current="page"`. On /tool/axial a screen
  // reader announced "Library, current page" while the reader was on Axial
  // response.
  assert.equal(navCurrent(item("Library"), "/tool/axial"), "true");
  assert.equal(navCurrent(item("Build"), "/studio/draft-1"), "true");
  assert.equal(navCurrent(item("Project"), "/projects/abc"), "true");
});

test("an unrelated section carries nothing", () => {
  assert.equal(navCurrent(item("Build"), "/tool/axial"), undefined);
  assert.equal(navCurrent(item("Review"), "/"), undefined);
  for (const entry of PRIMARY_NAV) assert.equal(navCurrent(entry, "/reference"), undefined);
});

test("exactly one link can ever claim to be the page", () => {
  for (const path of ["/", "/tool/axial", "/studio", "/studio/x", "/review", "/workshop", "/reference"]) {
    const claiming = PRIMARY_NAV.filter((entry) => navCurrent(entry, path) === "page");
    assert.ok(claiming.length <= 1, `${path} had ${claiming.length} links claiming to be the page`);
  }
});
