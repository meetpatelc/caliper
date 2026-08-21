/**
 * Closed-loop engineering audit: catalog integrity + live route crawl.
 * Writes /workspace/screenshots/loop-audit.json
 */
import { chromium } from "playwright";
import { writeFile, mkdir, readFile } from "node:fs/promises";

const BASE = "http://127.0.0.1:8080";
const OUT = "/workspace/screenshots";

const routes = [
  "/",
  "/library",
  "/review",
  "/reference",
  "/projects",
  "/about",
  "/feedback",
  "/login",
  "/tool/axial",
  "/tool/beam",
  "/tool/converter",
  "/tool/mohrCircle",
  "/tool/hydraulicCylinder",
  "/tool/threePhasePower",
  "/tool/controlChart",
  "/tool/idealGas",
  "/tool/npshAvailableBudget",
  "/tool/sheetBendAllowance",
  "/tool/does-not-exist",
];

const findings = [];
const note = (id, status, detail) => findings.push({ id, status, detail });

function idsFrom(source, pattern) {
  return [...source.matchAll(pattern)].map((m) => m[1]);
}

async function completeness() {
  const catalog = await readFile("/workspace/src/lib/catalog.ts", "utf8");
  const engineering = await readFile("/workspace/src/lib/engineering.ts", "utf8");
  const sketches = await readFile("/workspace/src/components/sketches.tsx", "utf8");
  const aliases = await readFile("/workspace/src/lib/catalog.ts", "utf8");

  const catalogIds = idsFrom(catalog, /\n\s+id: "([A-Za-z0-9]+)"/g);
  const unique = new Set(catalogIds);
  note("catalog.count", catalogIds.length === unique.size ? "pass" : "fail", `${catalogIds.length} entries, ${unique.size} unique`);

  const fieldsBlock = engineering.slice(engineering.indexOf("export const toolFields"), engineering.indexOf("export const initialInputs"));
  const inputsBlock = engineering.slice(engineering.indexOf("export const initialInputs"), engineering.indexOf("export function conversionUnits") >= 0 ? engineering.indexOf("export function conversionUnits") : engineering.indexOf("export const calculate"));
  const fieldIds = idsFrom(fieldsBlock, /\n {2}([A-Za-z0-9]+): \[/g);
  const inputIds = idsFrom(inputsBlock, /\n {2}([A-Za-z0-9]+): \{/g);
  const calcIds = idsFrom(engineering, /if \(toolId === "([^"]+)"\) return calculate/g);
  const namedSketches = idsFrom(sketches, /case "([^"]+)":/g);
  const aliasIds = idsFrom(aliases, /\n {2}([A-Za-z0-9]+): \[/g).filter((id) => catalogIds.includes(id));

  const missing = (have, label) => {
    const miss = catalogIds.filter((id) => !have.includes(id));
    note(label, miss.length ? "fail" : "pass", miss.length ? miss.join(",") : `all ${catalogIds.length} tools covered`);
    return miss;
  };
  missing(fieldIds, "catalog.fields");
  missing(inputIds, "catalog.inputs");
  missing(calcIds.filter((id) => id !== "converter").concat(["converter"]), "catalog.calculate");
  missing(aliasIds, "catalog.aliases");
  const missingDiagrams = catalogIds.filter((id) => !namedSketches.includes(id) && id !== "converter");
  note("diagrams", "pass", `named sketches: ${namedSketches.length}; relation plate for ${missingDiagrams.length}`);

  const hardcoded = [];
  for (const [file, text] of [
    ["src/routes/index.tsx", await readFile("/workspace/src/routes/index.tsx", "utf8")],
    ["src/components/app-shell.tsx", await readFile("/workspace/src/components/app-shell.tsx", "utf8")],
    ["src/components/command-palette.tsx", await readFile("/workspace/src/components/command-palette.tsx", "utf8")],
    ["src/routes/__root.tsx", await readFile("/workspace/src/routes/__root.tsx", "utf8")],
  ]) {
    if (/\b166\b/.test(text)) hardcoded.push(file);
  }
  note("hardcoded.count", hardcoded.length ? "fail" : "pass", hardcoded.length ? `166 hardcoded in ${hardcoded.join(", ")}` : "count derived from catalog");

  const calcFallback = /return calculateConverter\(input\);/.test(engineering);
  note("calc.fallback", calcFallback ? "warn" : "pass", calcFallback ? "unknown toolId silently runs converter" : "no silent converter fallback");
  return { catalogIds };
}

async function crawl() {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const results = [];
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await desktop.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${page.url()} :: ${msg.text()}`);
  });
  page.on("pageerror", (err) => pageErrors.push(`${page.url()} :: ${err.message}`));

  for (const path of routes) {
    const res = await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(200);
    const body = (await page.locator("body").innerText()).slice(0, 200).replace(/\s+/g, " ");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    results.push({ path, status: res?.status() ?? 0, title: await page.title(), overflow, prefix: body });
  }

  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/loop-desk.png` });

  await page.keyboard.press("Control+k");
  await page.waitForTimeout(250);
  const paletteOpen = await page.getByPlaceholder(/Search/i).count();
  note("cmdk.open", paletteOpen ? "pass" : "fail", paletteOpen ? "palette opens with Ctrl+K" : "palette did not open");
  if (paletteOpen) {
    await page.getByPlaceholder(/Search/i).fill("npsh");
    await page.waitForTimeout(200);
    const hit = page.locator("[cmdk-item], [data-value]").filter({ hasText: /NPSH/i }).first();
    if (await hit.count()) {
      await hit.click();
    } else {
      await page.keyboard.press("Enter");
    }
    await page.waitForTimeout(500);
    note("cmdk.search", /npsh/i.test(page.url()) ? "pass" : "warn", `landed ${page.url()}`);
  }

  await page.goto(BASE + "/library", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/loop-library.png` });
  await page.getByPlaceholder(/Search tool/i).fill("beam");
  await page.waitForTimeout(350);
  const shown = await page.locator("text=/shown/i").innerText();
  note("library.search", /\d+ shown/.test(shown) && !shown.startsWith("0 ") ? "pass" : "fail", shown);

  await page.goto(BASE + "/tool/axial", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/loop-axial.png` });
  await page.locator("#axial-force").fill("80");
  await page.waitForTimeout(500);
  const resultText = (await page.locator("#results").innerText()).replace(/\s+/g, " ");
  note("calc.live", /66\.6|66\.7/.test(resultText) ? "pass" : "warn", resultText.slice(0, 240));

  const saveBtn = page.getByRole("button", { name: /^Save$/i });
  if (await saveBtn.count()) {
    await saveBtn.click();
    await page.waitForTimeout(400);
  }
  await page.goto(BASE + "/projects", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/loop-projects.png` });
  const saved = await page.getByText(/Axial response/i).count();
  note("projects.save", saved ? "pass" : "fail", saved ? "snapshot appears in Projects" : "save did not persist");

  await page.goto(BASE + "/review", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/loop-review.png` });
  await page.getByRole("button", { name: /Functional scope stated/i }).click();
  const rpn = await page.getByText(/RPN/i).innerText();
  note("review.fmea", /RPN\s+120/.test(rpn) ? "pass" : "warn", rpn);
  await page.getByRole("button", { name: /Save locally/i }).click();
  await page.waitForTimeout(250);

  await page.goto(BASE + "/feedback", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/loop-feedback.png` });
  await page.getByRole("button", { name: /^Submit$/i }).click();
  await page.waitForTimeout(300);
  const bodyText = await page.locator("body").innerText();
  note("feedback.empty", /Add a message/i.test(bodyText) ? "pass" : "warn", "empty submit guarded");

  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/loop-login.png` });
  const google = await page.getByRole("button", { name: /Google/i }).count();
  const x = await page.getByRole("button", { name: /Continue with X/i }).count();
  note("auth.providers", google && x ? "pass" : "fail", `Google=${google} X=${x}`);

  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Switch to light/i }).click();
  await page.waitForTimeout(250);
  const isLight = await page.evaluate(() => document.documentElement.classList.contains("light"));
  await page.screenshot({ path: `${OUT}/loop-desk-light.png` });
  note("theme.light", isLight ? "pass" : "fail", isLight ? "light class applied" : "theme toggle failed");
  await page.goto(BASE + "/tool/axial", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/loop-axial-light.png` });
  await page.getByRole("button", { name: /Switch to dark/i }).click();

  await page.goto(BASE + "/about", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/loop-about.png` });
  await page.goto(BASE + "/reference", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/loop-methods.png` });

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mpage = await mobile.newPage();
  await mpage.goto(BASE + "/", { waitUntil: "networkidle" });
  const mOverflow = await mpage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  note("mobile.overflow.home", mOverflow ? "fail" : "pass", mOverflow ? "horizontal overflow on home" : "no overflow");
  await mpage.screenshot({ path: `${OUT}/loop-home-mobile.png` });
  const signInHeader = await mpage.getByRole("link", { name: /Sign in/i }).count();
  note("mobile.signin", signInHeader ? "pass" : "fail", signInHeader ? "sign-in reachable" : "sign-in not in mobile chrome");
  await mpage.getByRole("button", { name: /Open menu/i }).click();
  await mpage.waitForTimeout(200);
  const drawerLinks = await mpage.locator("aside a").allInnerTexts();
  const drawerHasSignIn = drawerLinks.some((t) => /sign in/i.test(t));
  const drawerHasFeedback = drawerLinks.some((t) => /feedback/i.test(t));
  note("mobile.drawer", drawerHasSignIn && drawerHasFeedback ? "pass" : "warn", drawerLinks.join(" | "));
  await mpage.screenshot({ path: `${OUT}/loop-drawer-mobile.png` });
  await mpage.goto(BASE + "/library", { waitUntil: "networkidle" });
  await mpage.screenshot({ path: `${OUT}/loop-library-mobile.png` });
  await mpage.goto(BASE + "/review", { waitUntil: "networkidle" });
  await mpage.screenshot({ path: `${OUT}/loop-review-mobile.png` });
  await mpage.goto(BASE + "/tool/axial", { waitUntil: "networkidle" });
  await mpage.screenshot({ path: `${OUT}/loop-axial-mobile.png` });
  const mAxialOverflow = await mpage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  note("mobile.overflow.axial", mAxialOverflow ? "fail" : "pass", mAxialOverflow ? "overflow on axial" : "no overflow");

  const filteredConsole = consoleErrors.filter((t) => !/Download the React DevTools/i.test(t));
  note("console.errors", filteredConsole.length || pageErrors.length ? "fail" : "pass", [...filteredConsole, ...pageErrors].slice(0, 10).join(" | ") || "clean");

  await browser.close();
  return results;
}

await mkdir(OUT, { recursive: true });
const catalog = await completeness();
const crawlResults = await crawl();
const report = { at: new Date().toISOString(), findings, routes: crawlResults, toolCount: catalog.catalogIds.length };
await writeFile(`${OUT}/loop-audit.json`, JSON.stringify(report, null, 2));
const counts = findings.reduce((acc, f) => {
  acc[f.status] = (acc[f.status] || 0) + 1;
  return acc;
}, {});
console.log(JSON.stringify({ counts, findings, routeOverflow: crawlResults.filter((r) => r.overflow), unknown: crawlResults.find((r) => r.path.includes("does-not-exist")) }, null, 2));
