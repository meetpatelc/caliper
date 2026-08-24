#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:8080";
const outDir = "/workspace/screenshots";
mkdirSync(outDir, { recursive: true });

const findings = [];
function record(name, ok, detail) {
  findings.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

const browser = await chromium.launch({ headless: true });

async function shot(page, name) {
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const libraryText = await page.locator("body").innerText();
  record("library PageHeader", /Every released model/.test(libraryText) && /Library/.test(libraryText));
  const domainGroup = page.getByRole("group", { name: "Domain filter" });
  record("library SegmentedControl", (await domainGroup.count()) === 1);
  const nestedFav = await page.locator('a[href*="/tool/"] button').count();
  record("library favourite not nested in link", nestedFav === 0, `nested=${nestedFav}`);
  const favButtons = page.getByRole("button", { name: /favourites/i });
  record("library favourite buttons present", (await favButtons.count()) > 0, String(await favButtons.count()));
  await shot(page, "qa-library");

  await page.getByRole("group", { name: "Domain filter" }).getByRole("button", { name: /Statics & mechanics/ }).click();
  await page.waitForTimeout(200);
  record("library domain filter", /shown/i.test(await page.locator("body").innerText()));

  await page.goto(`${BASE}/tool/axial`, { waitUntil: "networkidle" });
  await page.locator("#results, #inputs").first().waitFor();
  const calcText = await page.locator("body").innerText();
  record("calculator opened", /Results|Resolve the input/.test(calcText), page.url());
  record("calculator FavouriteButton", (await page.getByRole("button", { name: /Favourite/ }).count()) >= 1);
  record("calculator ExampleButton", (await page.getByRole("button", { name: "Example" }).count()) === 1);
  await shot(page, "qa-axial");

  const example = page.getByRole("button", { name: "Example" });
  await example.click();
  await page.waitForTimeout(400);
  const toast = page.getByText("Example restored.");
  record("example toast", (await toast.count()) >= 1);

  await page.goto(`${BASE}/tool/axial`, { waitUntil: "networkidle" });
  await page.locator("#axial-force, #inputs").first().waitFor();
  const before = await page.locator("#results").innerText();
  const force = page.locator("#axial-force");
  if (await force.count()) {
    await force.fill("77");
    await force.blur();
    await page.waitForTimeout(600);
    const after = await page.locator("#results").innerText();
    record("axial input updates result", after !== before, after.slice(0, 80).replace(/\s+/g, " "));
    await page.getByRole("button", { name: "Example" }).click();
    await page.waitForTimeout(500);
    record("axial example restores", /41\.|MPa/.test(await page.locator("#results").innerText()));
  } else {
    record("axial input updates result", false, "force field missing");
  }
  await shot(page, "qa-axial-calc");

  await page.goto(`${BASE}/studio`, { waitUntil: "networkidle" });
  record("studio PageHeader", /Name the quantities/.test(await page.locator("body").innerText()));
  await shot(page, "qa-studio");
  await page.getByRole("button", { name: /Create from scratch/ }).click();
  await page.waitForURL(/\/studio\/[^/]+/);
  await page.locator('[aria-label="Studio steps"]').waitFor();
  const stepGroup = page.locator('[aria-label="Studio steps"]');
  record("studio SegmentedControl steps", (await stepGroup.count()) === 1, `count=${await stepGroup.count()}`);
  await page.getByRole("button", { name: "Delete draft" }).click();
  const confirm = page.getByRole("dialog", { name: "Delete this draft?" });
  record("studio ConfirmDialog", await confirm.isVisible());
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  record("studio ConfirmDialog escape", !(await confirm.isVisible()));

  await page.goto(`${BASE}/review`, { waitUntil: "networkidle" });
  const reviewGroup = page.getByRole("group", { name: "Review area" });
  record("review SegmentedControl", (await reviewGroup.count()) === 1);
  record("review PageHeader", /Engineering review/.test(await page.locator("body").innerText()));
  await page.getByRole("button", { name: "Drawing review" }).click();
  await page.waitForTimeout(200);
  record("review area switch", (await page.getByRole("button", { name: "Drawing review" }).getAttribute("aria-pressed")) === "true");
  await shot(page, "qa-review");

  await page.goto(`${BASE}/workshop`, { waitUntil: "networkidle" });
  record("project PageHeader", /On this (account|device)/.test(await page.locator("body").innerText()));
  await shot(page, "qa-project");

  await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const settingsBody = await page.locator("body").innerText();
  const onSettings = /appearance/i.test(settingsBody);
  record("settings reachable", onSettings || /Sign in|Create an account/.test(settingsBody), page.url());
  if (onSettings) {
    const appearance = page.getByRole("group", { name: "Appearance" });
    record("settings ThemeToggle segmented", (await appearance.count()) === 1);
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await page.waitForTimeout(200);
    const dark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    record("settings applyTheme dark", dark);
    const themeColor = await page.evaluate(() => document.querySelector('meta[name="theme-color"]')?.getAttribute("content"));
    record("theme-color dark", themeColor === "#14161a", String(themeColor));
    await page.getByRole("button", { name: "Light", exact: true }).click();
    await page.waitForTimeout(200);
    const light = await page.evaluate(() => document.documentElement.classList.contains("light"));
    record("settings applyTheme light", light);
  }

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.keyboard.press("Control+k");
  const search = page.getByPlaceholder("Search models, favourites, checks, reviews, drafts");
  record("search overlay keyboard", await search.isVisible());
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  record("search overlay escape", !(await search.isVisible()));

  const account = page.getByRole("button", { name: "Account" });
  if (await account.count()) {
    await account.click();
    const menu = page.getByRole("menu");
    record("account Menu", await menu.isVisible());
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    record("account Menu escape", !(await menu.isVisible()));
  } else {
    record("account Menu", (await page.getByRole("link", { name: "Sign in" }).count()) >= 1, "signed out chrome");
  }

  const themeToggle = page.getByRole("button", { name: /Switch to (dark|light) theme/ });
  if (await themeToggle.count()) {
    const beforeDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    await themeToggle.click();
    await page.waitForTimeout(150);
    const afterDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    record("header ThemeToggle", afterDark !== beforeDark, `dark ${beforeDark}->${afterDark}`);
    await themeToggle.click();
  } else {
    record("header ThemeToggle", false, "missing");
  }

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobile.setDefaultTimeout(20000);
  await mobile.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  record("library mobile no overflow", !overflow, `scrollWidth=${await mobile.evaluate(() => document.documentElement.scrollWidth)}`);
  await mobile.screenshot({ path: `${outDir}/qa-library-mobile.png`, fullPage: true });
  await mobile.getByRole("button", { name: "Open menu" }).click();
  const drawer = mobile.getByRole("dialog", { name: "Instrument" });
  record("mobile drawer OverlayDialog", await drawer.isVisible());
  await mobile.keyboard.press("Escape");
  await mobile.waitForTimeout(200);
  record("mobile drawer escape", !(await drawer.isVisible()));

  await mobile.goto(`${BASE}/studio`, { waitUntil: "networkidle" });
  await mobile.screenshot({ path: `${outDir}/qa-studio-mobile.png`, fullPage: true });
  await mobile.goto(`${BASE}/review`, { waitUntil: "networkidle" });
  await mobile.screenshot({ path: `${outDir}/qa-review-mobile.png`, fullPage: true });
  await mobile.goto(`${BASE}/workshop`, { waitUntil: "networkidle" });
  await mobile.screenshot({ path: `${outDir}/qa-project-mobile.png`, fullPage: true });
  await mobile.goto(`${BASE}/tool/axial`, { waitUntil: "networkidle" });
  await mobile.screenshot({ path: `${outDir}/qa-axial-mobile.png`, fullPage: true });
  const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  record("axial mobile no overflow", !mobileOverflow);

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await shot(page, "qa-library-dark");
  await page.evaluate(() => document.documentElement.classList.remove("dark"));

  const realErrors = errors.filter((message) => !/Hydration failed/.test(message));
  record("no unexpected page errors", realErrors.length === 0, realErrors.join(" | "));
} finally {
  await browser.close();
}

const failed = findings.filter((item) => !item.ok);
console.log(`\n${findings.length - failed.length}/${findings.length} passed`);
if (failed.length) {
  process.exit(1);
}
