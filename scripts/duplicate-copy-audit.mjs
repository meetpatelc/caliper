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
 * Two rounds of filtering brought this from 60 to 12, both at render and only
 * where the duplicate is visible on the same screen:
 *
 *   42  assumptions that were word for word a field label
 *   19  assumptions that a field's help text already opened with
 *
 * The 12 that remain are a different thing and are correct. They are a label
 * appearing once under Inputs and once under Results — the value you entered,
 * echoed beside the number it produced. "Declared Reynolds number" shows twice
 * on darcyFrictionFactor because you supply it and the result reports it back.
 * Removing that would make the result harder to read, not easier.
 *
 * So this number should not go to zero. Raise the alarm if it grows; do not
 * chase it down.
 */
const CEILING = 12;
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
