import assert from "node:assert/strict";
import test from "node:test";
import { sourceRegistry } from "@/lib/platform";
import { tools } from "@/lib/catalog";

/**
 * Tools cite sources by id; the registry holds the citation. Nothing tied the
 * two together, so moving attributions off MechaniCalc, FIRGELLI and RoyMech
 * renamed 18 ids on the tools and left 15 records behind — dangling references
 * on one side, dead entries on the other, and no symptom, because the tool page
 * renders its own sourceLabel and never consults the registry.
 *
 * A provenance claim that points at nothing is worse than none on a product
 * whose proposition is that the work can be checked.
 */
const registered = new Set(sourceRegistry.map((record) => record.id));

test("every source a tool cites exists in the registry", () => {
  const dangling = [];
  for (const tool of tools) {
    for (const id of tool.contract.sourceIds ?? []) {
      if (!registered.has(id)) dangling.push(`${tool.id} cites unknown source "${id}"`);
    }
  }
  assert.deepEqual(dangling, []);
});

test("every registry record is cited by something", () => {
  const cited = new Set();
  for (const tool of tools) for (const id of tool.contract.sourceIds ?? []) cited.add(id);
  const orphans = [...registered].filter((id) => !cited.has(id));
  assert.deepEqual(orphans, [], `unreferenced source records: ${orphans.join(", ")}`);
});

test("registry ids are unique and records are complete", () => {
  const seen = new Set();
  for (const record of sourceRegistry) {
    assert.ok(!seen.has(record.id), `duplicate source id "${record.id}"`);
    seen.add(record.id);
    assert.ok(record.label.trim().length > 2, `${record.id} has no label`);
    assert.ok(record.scope.trim().length > 2, `${record.id} has no scope`);
    // A printed work has no URL, and the citation is the label. Anything that
    // does carry one must be a real absolute address, not a fragment.
    if (record.url) assert.match(record.url, /^https?:\/\//, `${record.id} has a malformed url`);
  }
});

test("a tool cites the same source at most once", () => {
  const repeats = [];
  for (const tool of tools) {
    const ids = tool.contract.sourceIds ?? [];
    if (new Set(ids).size !== ids.length) repeats.push(tool.id);
  }
  assert.deepEqual(repeats, []);
});

/**
 * Attribution may not point at another calculator site.
 *
 * Thirty-nine of the 169 tools cited one — Engineering ToolBox, Engineers Edge,
 * GD&T Basics and a dozen others — on a product whose whole claim is that the
 * work can be checked. A calculator page is not where a relation comes from; it
 * is somewhere the same relation is also stated, which is a different thing and
 * a weaker one.
 *
 * The replacements name a document instead, and carry no URL. That is already
 * how Roark and Shigley are cited, `instrument-page.tsx` renders a label with
 * no link as plain text, and a precise title cannot rot the way a guessed link
 * can.
 *
 * The list is hosts, not a judgement about quality. Several of these are useful
 * sites. They are simply not sources.
 */
const COMPETITOR_HOSTS = [
  "engineeringtoolbox.com",
  "engineersedge.com",
  "engineeringlibrary.org",
  "amesweb.info",
  "katmarsoftware.com",
  "x-engineer.org",
  "mathwords.com",
  "gdandtbasics.com",
  "accendoreliability.com",
  "6sigma.us",
  "oee.com",
  "drivetrainhub.com",
  "khkgears.net",
  "abbottaerospace.com",
  "epi-eng.com",
];

/** The host of a url, or empty. Hosts are matched as hosts, never as substrings. */
/** @param {unknown} url */
const hostOf = (url) => { try { return new URL(String(url)).host.replace(/^www./, "").toLowerCase(); } catch { return ""; } };

/**
 * Brand names as they are written, not fragments.
 *
 * The first version of this test stripped the TLD and matched the remainder
 * anywhere in the label, so "oee.com" became "oee" and flagged "Nakajima,
 * Introduction to TPM — OEE definition" — a correct citation reported as a
 * competitor. A guard that cries wolf on the fix it was written to protect is
 * worse than no guard.
 */
const COMPETITOR_BRANDS = [
  "engineering toolbox",
  "engineers edge",
  "engineeringlibrary",
  "gd&t basics",
  "mathwords",
  "katmar",
  "accendo",
  "sixsigma.us",
  "oee.com",
  "drivetrain hub",
  "khk ",
  "abbott aerospace",
  "x-engineer",
  "amesweb",
];

/**
 * @param {unknown} url
 * @param {unknown} label
 * @returns {string[]}
 */
const mentions = (url, label) => {
  /** @type {string[]} */
  const hits = [];
  const host = hostOf(url);
  if (host && COMPETITOR_HOSTS.includes(host)) hits.push(host);
  const text = String(label ?? "").toLowerCase();
  for (const brand of COMPETITOR_BRANDS) if (text.includes(brand)) hits.push(brand);
  return hits;
};
test("no tool cites another calculator site as its source", () => {
  const offenders = [];
  for (const tool of tools) {
    const hits = mentions(tool.sourceUrl, tool.sourceLabel);
    if (hits.length) offenders.push(`${tool.id} — ${tool.sourceLabel} (${hits.join(", ")})`);
  }
  assert.deepEqual(offenders, [], `attribution pointing at a competitor:\n  ${offenders.join("\n  ")}`);
});

test("no registry record cites another calculator site", () => {
  const offenders = [];
  for (const record of sourceRegistry) {
    const hits = mentions(record.url, record.label);
    if (hits.length) offenders.push(`${record.id} — ${record.label}`);
  }
  assert.deepEqual(offenders, [], `registry records pointing at a competitor:\n  ${offenders.join("\n  ")}`);
});
