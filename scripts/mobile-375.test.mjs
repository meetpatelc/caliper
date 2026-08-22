import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "playwright";

const BASE = process.env.CALIPER_URL ?? "http://127.0.0.1:8080";

async function live() {
  try {
    const response = await fetch(BASE, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

const ready = await live();

test("375 px: Axial number, labels, no overflow", { skip: !ready }, async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(`${BASE}/tool/axial?force=50&area=1200&length=250&modulus=200`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const body = await page.locator("body").innerText();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  const forceUnit = await page.locator('select[aria-label="Axial load unit"]').count();
  const resultUnit = await page.locator('select[aria-label="Average normal stress unit"]').count();
  await browser.close();
  assert.equal(overflow, false, "horizontal overflow");
  assert.match(body, /41\.667/);
  assert.match(body, /Copy link/);
  assert.match(body, /When/);
  assert.match(body, /Don/);
  assert.equal(forceUnit, 1);
  assert.equal(resultUnit, 1);
});

test("375 px: beamDiagram shows the span sketch, no overflow", { skip: !ready }, async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(`${BASE}/tool/beamDiagram`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  const labels = await page.locator("svg[aria-label]").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
  const body = await page.locator("body").innerText();
  await browser.close();
  assert.equal(overflow, false, "horizontal overflow");
  assert.ok(labels.some((label) => /supported span|point load/i.test(label ?? "")), String(labels));
  assert.match(body, /Support span/);
});
