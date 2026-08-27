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
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { get as httpGet } from "node:http";
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

/**
 * Stale-server guard.
 *
 * `vite preview` keeps serving whatever it loaded at start-up, so a rebuild
 * leaves it handing out HTML that references asset hashes no longer on disk.
 * The symptom is specific and misleading: SSR renders correct values while the
 * client sits dead, because its JS 404s — which reads exactly like a
 * regression in the code under test. It cost two false alarms before being
 * recognised, so check it before running anything else.
 */
async function assertServingCurrentBuild(base) {
  const assetsDir = join(repoRoot, ".vercel/output/static/assets");
  if (!existsSync(assetsDir)) return; // dev server: nothing was built to compare
  // Raw http rather than fetch: this runs before the browser starts and may
  // exit the process, and undici keeps its socket pooled long enough for an
  // abrupt exit to trip a libuv assertion on Windows. Own the socket, close it.
  const html = await new Promise((resolvePage) => {
    const request = httpGet(base, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => (body += chunk));
      response.on("end", () => {
        response.destroy();
        resolvePage(body);
      });
    });
    request.on("error", () => resolvePage(""));
    request.setTimeout(5000, () => {
      request.destroy();
      resolvePage("");
    });
  });
  const served = html.match(/index-[A-Za-z0-9_-]+\.js/)?.[0];
  if (!served) return; // unreachable, or dev HTML with no hashed entry chunk
  const built = readdirSync(assetsDir).find((f) => /^index-.*\.js$/.test(f));
  if (built && served !== built) {
    console.error(
      `
Stale server: it is serving ${served} but the build produced ${built}.
` +
        `Restart the preview so it picks up the current build — any failures
` +
        `below would be about assets that no longer exist, not about the code.
`,
    );
    process.exitCode = 3;
    return false;
  }
  return true;
}

const buildIsCurrent = await assertServingCurrentBuild(BASE);
if (buildIsCurrent === false) process.exit(3);

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

  // Assert the filter actually narrows the grid, rather than that a "N shown"
  // caption exists — the caption was removed as redundant, and counting the
  // cards tests the behaviour instead of a label that happened to describe it.
  const cardsBefore = await page.locator('a[href*="/tool/"]').count();
  await page.getByRole("group", { name: "Domain filter" }).getByRole("button", { name: /Statics & mechanics/ }).click();
  await page.waitForTimeout(300);
  const cardsAfter = await page.locator('a[href*="/tool/"]').count();
  record(
    "library domain filter narrows the grid",
    cardsAfter > 0 && cardsAfter < cardsBefore,
    `${cardsBefore} -> ${cardsAfter}`,
  );

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

  // A shared record is a page someone else opens cold, so it has to render
  // the finished calculation from the URL alone — no store, no session.
  await page.goto(`${BASE}/record/axial?force=%2220%22&area=%221000%22&length=%221000%22&modulus=%22200%22`, {
    waitUntil: "networkidle",
  });
  const recordText = await page.locator("body").innerText();
  record("record renders from the url alone", /calculation record/i.test(recordText));
  record(
    "record carries the computed result",
    /20/.test(recordText) && /MPa/.test(recordText),
    recordText.replace(/\s+/g, " ").slice(0, 70),
  );
  record("record states its boundary", /stops being valid|not an approval/i.test(recordText));
  const recordTitle = await page.title();
  record("record title names the result", /20 MPa/.test(recordTitle), recordTitle);

  // A modal marks the page behind it inert so the background cannot be reached.
  // Rendered inside that same subtree, the dialog inherits the inertness and its
  // own buttons stop responding — to the mouse and to the keyboard both, leaving
  // a reload as the only exit. `.click()` still fires the handler, so this is
  // invisible to any check that clicks programmatically; it has to be asked as a
  // hit-test question, at the button's own centre.

  // The favourites rail used to live in the viewport gutter behind
  // `hidden min-[1440px]:block`, so on a 1366px laptop there was no way to
  // reach a favourite at all. A tab needs 36px, not a 260px gutter.
  await page.goto(`${BASE}/tool/axial`, { waitUntil: "networkidle" });
  const rail = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll(".side-tab")];
    return { count: tabs.length, labels: tabs.map((t) => t.getAttribute("aria-label")) };
  });
  record("all three side tabs render", rail.count === 3, rail.labels.join(", "));

  await page.getByRole("button", { name: "Convert" }).click();
  await page.waitForTimeout(300);
  const railOpen = await page.evaluate(() => {
    const panel = document.querySelector('[role="region"][aria-label="Convert"]');
    return {
      open: Boolean(panel),
      // The point of building this rather than reusing the modal drawer: the
      // page behind stays live, unlocked and reachable.
      inert: document.getElementById("main-content")?.hasAttribute("inert") ?? false,
      locked: document.body.style.overflow === "hidden",
      result: panel?.querySelector('[role="status"]')?.textContent ?? "",
    };
  });
  record("a side tab opens without taking the page hostage", railOpen.open && !railOpen.inert && !railOpen.locked);
  record("quick convert computes in the rail", /1000\s*mm/.test(railOpen.result), railOpen.result);

  // Two queries a machinist would actually type used to return an empty list:
  // "cv valve sizing" (no tool text contains "sizing") and "feeds and speeds"
  // (the text says "speed"). The filter scored 1 or 0, so one unmatched word
  // discarded the whole query.
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const searchTop = async (query) => {
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })));
    await page.waitForSelector("[cmdk-input]", { timeout: 5000 });
    await page.fill("[cmdk-input]", query);
    await page.waitForTimeout(400);
    const top = await page.evaluate(() => {
      const first = document.querySelector("[cmdk-item]");
      return first ? first.innerText.trim().split(String.fromCharCode(10))[0] : "";
    });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    return top;
  };
  record("\"cv valve sizing\" finds the valve tool", /valve/i.test(await searchTop("cv valve sizing")));
  record("\"feeds and speeds\" finds the cutting tool", /cutting/i.test(await searchTop("feeds and speeds")));

  // Help text existed on every field and reached no screen reader: it had no id
  // to point at, and sitting inside the wrapping <label> it was folded into the
  // control's accessible name instead of its description.
  await page.goto(`${BASE}/tool/axial`, { waitUntil: "networkidle" });
  const described = await page.evaluate(() => {
    // Value fields only. The unit selects beside them are a separate control
    // with no help text of their own, so counting them would make this assert
    // something untrue.
    const controls = [...document.querySelectorAll("#inputs input")];
    const withHint = controls.filter((el) => (el.getAttribute("aria-describedby") ?? "").includes("-hint"));
    const resolves = withHint.every((el) =>
      (el.getAttribute("aria-describedby") ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .every((id) => document.getElementById(id) !== null),
    );
    return { total: controls.length, withHint: withHint.length, resolves };
  });
  record(
    "every input is described by its help text",
    described.withHint > 0 && described.withHint === described.total,
    `${described.withHint}/${described.total}`,
  );
  record("every aria-describedby points at an element that exists", described.resolves);

  // The catalog decides which models can hurt someone and then said nothing
  // about it. Tier C must announce itself; tier A must not, or the signal is
  // worth nothing.
  await page.goto(`${BASE}/tool/boltPreload`, { waitUntil: "networkidle" });
  const tierC = await page.locator("body").innerText();
  record("tier C model warns that a wrong number has consequences", /physical consequences/i.test(tierC));
  record("boundary is stated at the result, not only on /about", /valid only within/i.test(tierC));

  await page.goto(`${BASE}/tool/ohm`, { waitUntil: "networkidle" });
  const tierA = await page.locator("body").innerText();
  record("tier A model does not cry wolf", !/physical consequences/i.test(tierA));

  // The tool page rendered warnings[0] and dropped the rest. thinVessel outside
  // its range raises an applicability warning on top of its standing caveat, so
  // both must appear — the applicability one is unshifted to the front, which is
  // exactly how the standing caveat used to get lost.
  await page.goto(`${BASE}/tool/thinVessel?pressure=%221.2%22&diameter=%22600%22&thickness=%22120%22`, {
    waitUntil: "networkidle",
  });
  const vessel = await page.locator("body").innerText();
  record(
    "every warning is shown, not just the first",
    /not a thin wall/i.test(vessel) && /membrane/i.test(vessel) && /thin-wall screen|excludes|not a code check/i.test(vessel),
  );

  // Client-side navigation between tools, not a fresh load of each. Per-tool
  // state is initialised on mount, so without a remount the previous tool's
  // input renders against the new tool's fields: going from any calculator into
  // the unit converter used to kill the page with "Unknown unit family:
  // undefined". Loading /tool/converter directly always worked, which is what
  // hid it — this has to be a click, not a goto.
  await page.goto(`${BASE}/tool/axial`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    history.pushState({}, "", "/tool/converter");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.waitForTimeout(1200);
  const converterText = await page.locator("body").innerText();
  record(
    "calculator to converter survives client-side navigation",
    !/Something went wrong|Unknown unit family/i.test(converterText),
    converterText.replace(/\s+/g, " ").slice(0, 60),
  );

  await page.goto(`${BASE}/workshop`, { waitUntil: "networkidle" });
  await page.fill("#folder-name", "QA hit test");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Delete QA hit test" }).click();
  const confirmReachable = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return { open: false };
    const confirm = [...dialog.querySelectorAll("button")].find((b) => b.textContent.trim() === "Delete");
    if (!confirm) return { open: true, found: false };
    const box = confirm.getBoundingClientRect();
    const top = document.elementFromPoint(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2));
    return { open: true, found: true, reachable: top === confirm || confirm.contains(top) };
  });
  record("modal confirm is reachable by a real pointer", confirmReachable.reachable === true);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  // Wait for the dialog to go rather than reading the body straight after the
  // click — the assertion otherwise races React's re-render and fails for
  // timing rather than for the thing it is checking.
  await page.waitForSelector('[role="dialog"]', { state: "detached", timeout: 5000 }).catch(() => {});
  // Assert on the folder's own control, not on body text: the success toast
  // names the folder it just removed, so the page still says "QA hit test"
  // for a few seconds after the delete genuinely succeeded.
  record(
    "modal confirm actually commits",
    (await page.getByRole("button", { name: "Delete QA hit test" }).count()) === 0,
  );

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
