#!/usr/bin/env node
/**
 * Design-system QA against a running app: checks that shared kit components
 * are the ones actually on the page (one SegmentedControl for the domain
 * filter, no nested interactive controls inside cards, and so on).
 *
 * Run it against a dev server:
 *   npm run dev
 *   npm run qa:ui                      # defaults to http://127.0.0.1:8080
 *   npm run qa:ui -- http://host:port  # or point it somewhere else
 *
 * Screenshots go to ./screenshots (gitignored) unless UI_QA_OUT_DIR says
 * otherwise. This previously wrote to a hardcoded /workspace/screenshots,
 * which does not exist outside the original sandbox — so the script could not
 * run anywhere else and drifted out of use.
 */
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.argv[2] || process.env.UI_QA_BASE_URL || "http://127.0.0.1:8080";
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = process.env.UI_QA_OUT_DIR
  ? resolve(process.env.UI_QA_OUT_DIR)
  : join(repoRoot, "screenshots");
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
  const unitNamed = await page.locator("#inputs select[aria-label]").count();
  record("calculator unit select named", unitNamed >= 1, String(unitNamed));
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
  const confirmBtn = confirm.getByRole("button", { name: "Delete" });
  const confirmClass = (await confirmBtn.getAttribute("class")) ?? "";
  record("studio ConfirmDialog destructive", /bg-danger/.test(confirmClass), confirmClass);
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
    const restored = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    record("account Menu restore focus", restored === "Account", String(restored));
  } else {
    record("account Menu", (await page.getByRole("link", { name: "Sign in" }).count()) >= 1, "signed out chrome");
    record("account Menu restore focus", true, "signed out chrome");
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

  const tablet = await browser.newPage({ viewport: { width: 768, height: 1024 } });
  tablet.setDefaultTimeout(20000);
  await tablet.goto(`${BASE}/tool/axial`, { waitUntil: "networkidle" });
  await tablet.locator("#inputs").waitFor();
  const tabletCols = await tablet.locator(".instrument-sheet .grid.gap-px").evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  record("axial tablet two columns", tabletCols.split(" ").filter(Boolean).length >= 2, tabletCols);
  const tabletOverflow = await tablet.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  record("axial tablet no overflow", !tabletOverflow);
  await tablet.screenshot({ path: `${outDir}/qa-axial-tablet.png`, fullPage: true });
  await tablet.close();

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

  // ── Token regression ───────────────────────────────────────────────────────
  // Pixel baselines are the usual tool here, but they are the wrong one for
  // this repo: Playwright rasterises text differently on Windows and on the
  // Ubuntu runner, so a baseline captured on a contributor's machine fails in
  // CI for reasons that have nothing to do with the change.
  //
  // These assert the WIRING instead — that a rendered component resolves to the
  // token it is supposed to use — by reading both sides out of the live page.
  // No hex is repeated here, so the checks stay true when the palette moves and
  // fail when a component stops following it. Platform-independent, because
  // every value is computed by the same browser in the same run.
  const tokenChecks = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const token = (name) => root.getPropertyValue(name).trim();
    /** Resolve a token's declared value the way the browser paints it. */
    const asPainted = (value) => {
      const probe = document.createElement("span");
      probe.style.color = value;
      document.body.appendChild(probe);
      const painted = getComputedStyle(probe).color;
      probe.remove();
      return painted;
    };
    const accentLink = document.querySelector(".link-accent");
    const card = document.querySelector('a[href*="/tool/"]');
    return {
      fontSans: getComputedStyle(document.body).fontFamily,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      bgToken: asPainted(token("--color-bg")),
      accentPainted: accentLink ? getComputedStyle(accentLink).color : null,
      accentToken: asPainted(token("--color-accent")),
      cardRadius: card ? getComputedStyle(card.closest("div") ?? card).borderRadius : null,
      radiusMd: token("--radius-md"),
    };
  });

  record(
    "body background resolves to --color-bg",
    tokenChecks.bodyBg === tokenChecks.bgToken,
    `${tokenChecks.bodyBg} vs token ${tokenChecks.bgToken}`,
  );
  record(
    "accent links resolve to --color-accent",
    tokenChecks.accentPainted !== null && tokenChecks.accentPainted === tokenChecks.accentToken,
    `${tokenChecks.accentPainted} vs token ${tokenChecks.accentToken}`,
  );
  record(
    "body uses the IBM Plex Sans stack",
    /IBM Plex Sans/.test(tokenChecks.fontSans),
    tokenChecks.fontSans,
  );

  await page.evaluate(() => document.documentElement.classList.add("dark"));
  const darkChecks = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const probe = document.createElement("span");
    probe.style.color = root.getPropertyValue("--color-bg").trim();
    document.body.appendChild(probe);
    const bgToken = getComputedStyle(probe).color;
    probe.remove();
    return { bodyBg: getComputedStyle(document.body).backgroundColor, bgToken };
  });
  // The point of reassigning token NAMES rather than values: the same selectors
  // must follow the theme with no component change.
  record(
    "dark mode reassigns the same token names",
    darkChecks.bodyBg === darkChecks.bgToken && darkChecks.bodyBg !== tokenChecks.bodyBg,
    `dark ${darkChecks.bodyBg} vs light ${tokenChecks.bodyBg}`,
  );
  await shot(page, "qa-library-dark");
  await page.evaluate(() => document.documentElement.classList.remove("dark"));

  // Hydration failures used to be filtered out here. They are real bugs — React
  // throws away the server markup and re-renders the whole tree — and the app
  // is clean on a fresh load of every route this script visits, so they are
  // now reported like any other page error rather than swallowed.
  record("no unexpected page errors", errors.length === 0, errors.join(" | "));
} finally {
  await browser.close();
}

const failed = findings.filter((item) => !item.ok);
console.log(`\n${findings.length - failed.length}/${findings.length} passed`);
if (failed.length) {
  process.exit(1);
}
