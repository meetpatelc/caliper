#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const outDir = "/workspace/screenshots";
mkdirSync(outDir, { recursive: true });

async function fill(page, id, value) {
  const locator = page.locator(`#${id}`);
  await locator.waitFor({ state: "visible", timeout: 15000 });
  await locator.click();
  await locator.fill("");
  await locator.fill(String(value));
  await locator.blur();
}

async function waitSettled(page) {
  await page.waitForTimeout(250);
}

const findings = [];
function record(name, ok, detail) {
  findings.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(20000);

try {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Search" }).first().click();
  const search = page.getByPlaceholder("Search models, favourites, checks, reviews, drafts");
  await search.fill("Hertz contact");
  const hit = page.getByRole("option", { name: /Hertzian sphere-on-flat contact/i }).first();
  const item = (await hit.count()) ? hit : page.locator("[cmdk-item]").filter({ hasText: "Hertzian sphere-on-flat contact" }).first();
  await item.click();
  await page.waitForURL(/\/tool\/hertzContact/);
  await page.locator("#results").getByText("Reduced elastic modulus").waitFor();
  const body = await page.locator("body").innerText();
  record(
    "search-to-open Hertz contact",
    /hertzContact/.test(page.url()) && /58\.605/.test(body) && /GPa/.test(body),
    page.url(),
  );
  await page.screenshot({ path: `${outDir}/qa-hertz-default.png`, fullPage: true });

  await fill(page, "hertzContact-spherePoisson", "-1");
  await waitSettled(page);
  const hertzErr = await page.locator("#results").innerText();
  record(
    "hertzContact spherePoisson=-1 rejected",
    /poisson/i.test(hertzErr) && /0\.5/.test(hertzErr) && !/78\.555/.test(hertzErr),
    hertzErr.slice(0, 180),
  );
  await page.screenshot({ path: `${outDir}/qa-hertz-invalid.png`, fullPage: true });

  await page.goto(`${BASE}/tool/threePhasePower`, { waitUntil: "networkidle" });
  await page.locator("#results").getByText("Literal three-phase apparent power").waitFor();
  await fill(page, "threePhasePower-powerFactor", "-1");
  await waitSettled(page);
  const pfErr = await page.locator("#results").innerText();
  record(
    "threePhasePower powerFactor=-1 rejected",
    /between zero and one/i.test(pfErr) && !/-24\.942/.test(pfErr),
    pfErr.slice(0, 180),
  );
  await page.screenshot({ path: `${outDir}/qa-threephase-invalid.png`, fullPage: true });

  await page.goto(`${BASE}/tool/orificeFlow`, { waitUntil: "networkidle" });
  await fill(page, "orificeFlow-dischargeCoefficient", "0");
  await waitSettled(page);
  const cdErr = await page.locator("#results").innerText();
  record("orificeFlow Cd=0 rejected", /greater than 0/i.test(cdErr), cdErr.slice(0, 180));

  await page.goto(`${BASE}/tool/pressFit`, { waitUntil: "networkidle" });
  await fill(page, "pressFit-friction", "0");
  await waitSettled(page);
  const muErr = await page.locator("#results").innerText();
  record("pressFit friction=0 rejected", /greater than 0/i.test(muErr), muErr.slice(0, 180));

  await page.goto(`${BASE}/tool/thermalRadiation`, { waitUntil: "networkidle" });
  await fill(page, "thermalRadiation-emissivity", "-1");
  await waitSettled(page);
  const eErr = await page.locator("#results").innerText();
  record("thermalRadiation emissivity=-1 rejected", /0 through 1/i.test(eErr) && !/-816/.test(eErr), eErr.slice(0, 180));

  await page.goto(`${BASE}/tool/compressibleMassFlow`, { waitUntil: "networkidle" });
  await fill(page, "compressibleMassFlow-specificHeatRatio", "0");
  await waitSettled(page);
  const gErr = await page.locator("#results").innerText();
  record("compressibleMassFlow gamma=0 rejected", /greater than one/i.test(gErr), gErr.slice(0, 180));

  await page.goto(`${BASE}/tool/productionMetrics`, { waitUntil: "networkidle" });
  await fill(page, "productionMetrics-stopTime", "0");
  await waitSettled(page);
  const oee = await page.locator("#results").innerText();
  record(
    "productionMetrics stopTime=0 accepted",
    /100/.test(oee) && /640/.test(oee) && /must be greater than zero/i.test(oee) === false,
    oee.replace(/\s+/g, " ").slice(0, 220),
  );
  await page.screenshot({ path: `${outDir}/qa-oee-zero-stop.png`, fullPage: true });

  await page.goto(`${BASE}/tool/measurementUncertainty`, { waitUntil: "networkidle" });
  await fill(page, "measurementUncertainty-measuredValue", "0");
  await waitSettled(page);
  const unc = await page.locator("#results").innerText();
  record(
    "measurementUncertainty measuredValue=0 keeps absolute results",
    /Combined standard/i.test(unc) && /Expanded uncertainty/i.test(unc) && !/Division by zero/i.test(unc),
    unc.replace(/\s+/g, " ").slice(0, 220),
  );
  await page.screenshot({ path: `${outDir}/qa-uncertainty-zero.png`, fullPage: true });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE}/tool/hertzContact`, { waitUntil: "networkidle" });
  await page.locator("#hertzContact-spherePoisson").waitFor();
  await page.screenshot({ path: `${outDir}/qa-hertz-mobile.png`, fullPage: true });
  const hertzOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  record("hertzContact mobile 375×812 no overflow", hertzOverflow <= 1, `overflow=${hertzOverflow}`);

  await page.goto(`${BASE}/tool/orificeFlow`, { waitUntil: "networkidle" });
  await page.locator("#orificeFlow-dischargeCoefficient").waitFor();
  await page.screenshot({ path: `${outDir}/qa-orifice-mobile.png`, fullPage: true });
  const orificeOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  record("orificeFlow mobile 375×812 no overflow", orificeOverflow <= 1, `overflow=${orificeOverflow}`);
} catch (error) {
  record("live runner", false, error instanceof Error ? error.stack : String(error));
} finally {
  await browser.close();
}

const failed = findings.filter((item) => !item.ok);
writeFileSync(`${outDir}/qa-live-findings.json`, JSON.stringify({ findings, failed: failed.length }, null, 2));
if (failed.length) {
  console.error(JSON.stringify({ ok: false, failed }, null, 2));
  process.exit(2);
}
console.log(JSON.stringify({ ok: true, passed: findings.length }, null, 2));
