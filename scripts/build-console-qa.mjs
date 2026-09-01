// @ts-check
/**
 * Drive the production build and refuse a dirty console.
 *
 * Every check the repo had ran against a dev server, or against the source. The
 * defects that reached people this week did not live there: the source was
 * right, the tests were right, and the artifact was wrong.
 *
 * This covers one half of that class — the half that says something out loud. A
 * hydration mismatch logs to the console and can leave the page blank; a CSP
 * violation, a missing chunk and a runtime type error each announce themselves
 * to a listener and to nothing else. `ui-system-qa.mjs` comes closest, but it
 * is documented to run against `npm run dev` and it listens for `pageerror`
 * only, so a hydration mismatch — a `console.error` — passes it in silence.
 *
 * It does not cover the other half: failures that are silent by construction.
 * zod's message catalogue being tree-shaken raised nothing at all. Every
 * validation message simply read "Invalid input", which looks exactly like a
 * validation message, and no amount of driving the page could tell. That needs
 * an assertion about the artifact itself, which is `scripts/zod-locale.mjs`.
 *
 * Two checks, two halves. Neither is redundant and neither is sufficient.
 *
 * Run it against the real thing:
 *   npm run build
 *   npm run serve:build          # the Vercel function, not `vite preview`
 *   npm run qa:console
 *
 * `vite preview` is deliberately not the target. It serves the dev client, so a
 * bundler-shaped defect is invisible there — which is how a stale server on
 * 8081 once let 29 CSP checks pass against a page with no JavaScript on it.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || process.env.QA_BASE || "http://127.0.0.1:8081";

/**
 * What to visit. One per kind of page, not one per model: the point is to
 * exercise each *rendering path* — a library tool, a lookup-driven tool, a
 * table-backed Studio calculator, a record, an authoring screen.
 */
const ROUTES = [
  { path: "/", name: "home" },
  { path: "/tool/axial", name: "library tool (plain formula)" },
  { path: "/tool/beam", name: "library tool (lookup + choice)" },
  { path: "/tool/taylorToolLife", name: "library tool (conditional outputs)" },
  { path: "/c/metric-bolt-area", name: "studio calculator (table-backed)" },
  { path: "/record/axial?force=20&area=1000&fv=1.0.0", name: "record with a version stamp" },
  { path: "/studio", name: "Build" },
  { path: "/workshop", name: "Project" },
  { path: "/review", name: "Review" },
  { path: "/about", name: "About & limits" },
  { path: "/reference", name: "Method library" },
  { path: "/feedback", name: "Feedback" },
];

/**
 * Console noise that is not a defect.
 *
 * Deliberately short and specific. A broad pattern here would re-create the
 * exact problem this script exists to solve: a check that cannot observe the
 * failure looks identical to a passing one.
 */
const IGNORED = [
  // React's dev-only warning about extensions injecting into the tree.
  /Extra attributes from the server/i,
];
// There was a `/favicon\.ico/` rule here, written when that path 404'd. It did
// not silence noise, it silenced a defect: browsers request /favicon.ico
// whatever the document declares, the file did not exist, and the tab rendered
// empty. An ignore rule added to make a check pass is the check being taught to
// accept the thing it was supposed to catch.

/** Things that must fail loudly wherever they appear. */
const FATAL = [
  { pattern: /hydration failed|did not match|hydrating/i, why: "hydration mismatch" },
  { pattern: /content security policy/i, why: "CSP violation" },
  { pattern: /is not a function|is not defined|cannot read propert/i, why: "runtime type error" },
  { pattern: /failed to fetch dynamically imported module/i, why: "missing chunk" },
];

async function main() {
  const browser = await chromium.launch();
  const findings = [];

  for (const route of ROUTES) {
    const context = await browser.newContext();
    const page = await context.newPage();
    /** @type {string[]} */
    const problems = [];

    page.on("console", (message) => {
      if (message.type() !== "error" && message.type() !== "warning") return;
      const text = message.text();
      if (IGNORED.some((pattern) => pattern.test(text))) return;
      if (message.type() === "error") problems.push(text);
      else if (FATAL.some((entry) => entry.pattern.test(text))) problems.push(`[warning] ${text}`);
    });
    page.on("pageerror", (error) => problems.push(`[uncaught] ${error.message}`));

    /*
     * Name the asset that failed, rather than leaving it as console noise.
     *
     * Chromium does log "Failed to load resource: the server responded with a
     * status of 404" for a dead stylesheet, so the console rule above already
     * fails the run. What it does not say is *which* file, or that the file
     * was a stylesheet — and that is the whole diagnosis. The case this is
     * for: `vite preview` keeps serving the HTML it loaded at start-up, so
     * after a rebuild it hands out asset hashes that no longer exist and the
     * page renders as unstyled SSR markup with a dead client. Told "a resource
     * 404'd" you go looking at your last edit. Told "stylesheet
     * /assets/styles-Du2mbz1M.css" you restart the server.
     *
     * Only same-origin, and only the three types whose absence changes what
     * the page is: a third-party beacon failing is not this build being broken.
     */
    page.on("response", (response) => {
      const url = response.url();
      if (!url.startsWith(BASE)) return;
      if (response.status() < 400) return;
      const kind = response.request().resourceType();
      if (kind !== "stylesheet" && kind !== "script" && kind !== "font") return;
      problems.push(`[asset ${response.status()}] ${kind} ${url.slice(BASE.length)}`);
    });

    let status = 0;
    try {
      const response = await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle", timeout: 30000 });
      status = response?.status() ?? 0;
      // Give hydration a beat to run and fail, if it is going to.
      await page.waitForTimeout(1200);
    } catch (error) {
      problems.push(`[navigation] ${error instanceof Error ? error.message : String(error)}`);
    }

    // A page that renders nothing is a failure even with a clean console — the
    // blank tool page had exactly that shape.
    const bodyText = await page.evaluate(() => document.body.innerText.trim().length).catch(() => 0);
    if (bodyText < 40) problems.push(`[blank] rendered ${bodyText} characters of text`);
    if (status && status >= 500) problems.push(`[status] ${status}`);

    const fatal = problems.map((text) => {
      const match = FATAL.find((entry) => entry.pattern.test(text));
      return match ? `${match.why}: ${text}` : text;
    });

    findings.push({ route, problems: fatal });
    const ok = fatal.length === 0;
    console.log(`${ok ? "PASS" : "FAIL"}  ${route.path}  (${route.name})`);
    for (const problem of fatal.slice(0, 4)) console.log(`        ${problem.slice(0, 200)}`);

    await context.close();
  }

  await browser.close();

  const failed = findings.filter((entry) => entry.problems.length);
  console.log(`\n${findings.length - failed.length}/${findings.length} routes clean in the production build.`);
  if (failed.length) {
    console.error(`\n${failed.length} route(s) with console problems. These do not appear in dev.`);
    process.exitCode = 1;
  }
}

await main();
