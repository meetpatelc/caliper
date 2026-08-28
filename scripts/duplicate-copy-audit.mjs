#!/usr/bin/env node
/**
 * Find copy a tool page shows twice.
 *
 * Reported from the field: the limits block at the result repeated the method
 * section's "When" list verbatim, a screen apart. That one is fixed, but the
 * report was "repeating this on a lot of pages", and the only honest way to
 * answer that is to look at all of them.
 *
 * Reads `innerText`, deliberately. The served HTML also contains the print-only
 * sheet and the hydration payload, so a text search over markup reports
 * duplicates nobody can see and misses the fact that these are two different
 * questions. `innerText` is what a reader gets.
 *
 *   node scripts/duplicate-copy-audit.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { tools } from "../src/lib/catalog.ts";

const BASE = process.argv[2] || process.env.UI_QA_BASE_URL || "http://127.0.0.1:8080";

/** Short shared labels repeat legitimately — a heading and a button, say. */
const MIN_LENGTH = 18;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(20000);

const offenders = [];
let checked = 0;

for (const tool of tools) {
  const url = `${BASE}/tool/${tool.id}`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(150);
  } catch {
    continue;
  }
  const text = await page.evaluate(() => document.querySelector("main")?.innerText ?? "");
  if (!text) continue;
  checked += 1;

  // Every phrase the model itself supplies. These are the ones at risk of being
  // rendered by two different components that each think they own the boundary.
  const phrases = [...(tool.assumptions ?? []), tool.description, tool.outputLabel].filter(
    (phrase) => typeof phrase === "string" && phrase.trim().length >= MIN_LENGTH,
  );

  for (const phrase of phrases) {
    const needle = phrase.trim();
    let count = 0;
    let from = 0;
    for (;;) {
      const at = text.indexOf(needle, from);
      if (at === -1) break;
      count += 1;
      from = at + needle.length;
    }
    if (count > 1) offenders.push({ tool: tool.id, count, phrase: needle.slice(0, 60) });
  }
}

await browser.close();

console.log(`checked ${checked} tool pages`);
if (!offenders.length) {
  console.log("no phrase renders twice on any page");
  process.exit(0);
}

/**
 * A ceiling, not a target.
 *
 * 42 assumptions were word-for-word a field label on the same page; those are
 * filtered where the field is visible beside them, and the count went 60 -> 28.
 *
 * What remains is a different thing: an assumption that is the *opening* of a
 * field hint — "Uniform solid circular shaft" against a hint reading "Uniform
 * solid circular shaft diameter." The reader does see the words twice, but the
 * two strings are not the same claim, and deleting either one loses something.
 * That wants one of them rewritten, which is authoring, not filtering.
 *
 * Lower this as they are rewritten. It only goes down.
 */
const CEILING = 28;
if (offenders.length <= CEILING) {
  console.log(`${offenders.length} repeated phrases, at or under the ceiling of ${CEILING}`);
  for (const item of offenders) console.log(`  ${item.tool} x${item.count}  "${item.phrase}"`);
  process.exit(0);
}
console.log(`REGRESSION: ${offenders.length} repeated phrases, ceiling is ${CEILING}`);

const byTool = new Map();
for (const item of offenders) byTool.set(item.tool, (byTool.get(item.tool) ?? 0) + 1);
console.log(`\n${offenders.length} repeated phrases across ${byTool.size} pages\n`);
for (const item of offenders.slice(0, 40)) {
  console.log(`  ${item.tool} ×${item.count}  "${item.phrase}"`);
}
process.exitCode = 1;
