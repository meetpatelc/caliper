#!/usr/bin/env node
/**
 * What a model page actually costs, measured against the built function.
 *
 * Every tool page used to ship all 159 library documents — 143 kB gzipped on a
 * 391 kB page — because `document.ts` spread thirteen domain modules into one
 * object and the calculation path imported it. Nothing noticed, because a
 * bundle getting larger breaks no test and renders no differently. It is only
 * visible if something measures it.
 *
 *   node scripts/payload-qa.mjs [url]
 *
 * Two checks, and the second is the one that matters. A budget catches drift;
 * the import assertion catches the specific way this regresses, which is a
 * component reaching for `document-library.ts` because it wants one lookup and
 * pulling the whole library into the shared chunk behind it. That would show up
 * as a slow creep the budget might absorb, so it is asserted by name.
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const BASE = (process.argv[2] ?? "http://127.0.0.1:8085").replace(/\/$/, "");
const STATIC_ROOT = ".vercel/output/static";

/**
 * Headroom over what it costs today (326 kB), not a target to grow into.
 * Raising this is a decision; drifting past it should not be.
 */
const BUDGET_KB = 360;

const ROUTES = ["/tool/axial", "/tool/orificeFlow", "/tool/ohm"];

const findings = [];
function record(name, ok, detail) {
  findings.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

const browser = await chromium.launch();
try {
  for (const route of ROUTES) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const assets = new Set();
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (url.origin !== BASE) return;
      if (/\.(js|css)$/.test(url.pathname)) assets.add(url.pathname);
    });
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);

    let bytes = 0;
    for (const asset of assets) {
      try {
        bytes += gzipSync(readFileSync(join(STATIC_ROOT, asset))).length;
      } catch {
        // Served but not on disk: a dev-mode asset. Nothing to weigh.
      }
    }
    const kb = Math.round(bytes / 1024);
    record(`${route} stays within ${BUDGET_KB}kB gzipped`, kb <= BUDGET_KB, `${kb}kB over ${assets.size} assets`);

    // The whole-library module by name. A model page needs one document.
    const wholeLibrary = [...assets].filter((asset) => /document-library-/.test(asset));
    record(`${route} does not ship the whole library`, wholeLibrary.length === 0, wholeLibrary.join(", "));

    // And no more than one domain: the page's own. Loading several means
    // something is reaching across domains at import time.
    const domains = [...assets].filter((asset) => /\/library-(?!studio-seeds)/.test(asset));
    record(`${route} loads at most one domain up front`, domains.length <= 1, domains.join(", ") || "none");

    // Correct and cheap is the point; cheap alone is not.
    const results = await page.locator("#results").innerText().catch(() => "");
    record(`${route} still calculates`, results.length > 20 && !/No library document/.test(results), results.replace(/\s+/g, " ").slice(0, 50));
    await page.close();
  }
} finally {
  await browser.close();
}

const failed = findings.filter((item) => !item.ok);
console.log(`\n${findings.length - failed.length}/${findings.length} passed against ${BASE}`);
process.exit(failed.length ? 1 : 0);
