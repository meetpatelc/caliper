#!/usr/bin/env node
/**
 * Prove the Content-Security-Policy does not break the page.
 *
 * This exists because the previous attempt at enforcement shipped behind a
 * check that could not fail. A `securitypolicyviolation` listener attached
 * from the console *after* load cannot observe violations raised while the
 * document was parsing — which is when every one of these fires. It reported
 * zero violations on a page that was completely broken.
 *
 * Two things here are load-bearing:
 *
 *   1. The listener is installed with `addInitScript`, so it is registered
 *      before any page script runs, on every navigation. It sees parse-time
 *      violations.
 *   2. Violations alone are not the test. A policy can block hydration without
 *      any violation this harness happens to catch, so the last check drives a
 *      real interaction — type into a field, watch the result change — which
 *      is exactly what stopped working last time and is only possible if React
 *      hydrated.
 *
 *   node scripts/csp-qa.mjs [baseUrl]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || process.env.UI_QA_BASE_URL || "http://127.0.0.1:8080";

const ROUTES = ["/", "/library", "/about", "/tool/axial", "/tool/boltPreload", "/studio"];

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

// Registered before any document script, on every navigation. This is the
// whole reason the check is trustworthy.
await context.addInitScript(() => {
  window.__cspViolations = [];
  document.addEventListener(
    "securitypolicyviolation",
    (event) => {
      window.__cspViolations.push({
        directive: event.effectiveDirective || event.violatedDirective,
        blocked: String(event.blockedURI || "").slice(0, 120),
        sample: String(event.sample || "").slice(0, 80),
      });
    },
    true,
  );
});

const page = await context.newPage();
page.setDefaultTimeout(20000);

/**
 * A page whose scripts 404 raises no CSP violation, because nothing runs. That
 * is not a pass, and it has already fooled this check once: a stale server was
 * still answering on the port, serving HTML that named the previous build’s
 * asset hashes. Every violation check went green against a page with no
 * JavaScript at all.
 */
const missing = [];
page.on("response", (response) => {
  if (response.status() >= 400) missing.push(`${response.status()} ${response.url()}`);
});

const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() !== "error") return;
  const text = message.text();
  if (/content security policy|refused to/i.test(text)) consoleErrors.push(text);
});

for (const route of ROUTES) {
  const response = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });

  const header =
    response?.headers()["content-security-policy"] ??
    response?.headers()["Content-Security-Policy"] ??
    "";
  const reportOnly = response?.headers()["content-security-policy-report-only"] ?? "";

  const nonceMatch = header.match(/'nonce-([^']+)'/);
  record(`${route} is served an enforcing policy with a nonce`, Boolean(nonceMatch), header.slice(0, 60));
  record(
    `${route} carries no second policy`,
    !reportOnly,
    reportOnly ? "a report-only header is also set" : "",
  );

  if (nonceMatch) {
    // Every inline script on the page must carry this request's nonce —
    // ours in __root.tsx and the ones Start emits for the hydration payload.
    const inline = await page.evaluate(() =>
      [...document.querySelectorAll("script")]
        .filter((script) => !script.src)
        .map((script) => ({
          // The browser hides the value after parsing, so read the property.
          nonce: script.nonce || "",
          head: (script.textContent || "").slice(0, 40),
        })),
    );
    const unnonced = inline.filter((script) => !script.nonce);
    record(
      `${route} — all ${inline.length} inline scripts are nonced`,
      unnonced.length === 0,
      unnonced.map((script) => script.head.replace(/\s+/g, " ")).join(" | ").slice(0, 90),
    );
  }

  const violations = await page.evaluate(() => window.__cspViolations ?? []);
  record(
    `${route} raises no CSP violation from a cold load`,
    violations.length === 0,
    violations
      .slice(0, 3)
      .map((violation) => `${violation.directive} ${violation.blocked || violation.sample}`)
      .join(" | "),
  );
}

/**
 * The check the last attempt lacked.
 *
 * A blocked hydration script does not necessarily raise anything this harness
 * sees; it just leaves a page that renders and does nothing. Typing into a
 * field and watching the result move is only possible after React has taken
 * over, so this fails loudly on precisely the breakage that shipped before.
 */
await page.goto(`${BASE}/tool/axial`, { waitUntil: "networkidle" });
await page.locator("#results").waitFor();
const before = await page.locator("#results").innerText();
const force = page.locator("#axial-force");
if (await force.count()) {
  await force.fill("77");
  await page.waitForTimeout(400);
  const after = await page.locator("#results").innerText();
  record(
    "the page still hydrates under the enforced policy",
    after !== before,
    after.slice(0, 60).replace(/\s+/g, " "),
  );
} else {
  record("the page still hydrates under the enforced policy", false, "force field missing");
}

// Client-side navigation re-reads the nonce from the meta tag TanStack writes.
// If that tag were missing, this is where it would surface.
const metaNonce = await page.evaluate(
  () => document.querySelector('meta[property="csp-nonce"]')?.getAttribute("content") ?? "",
);
record("the csp-nonce meta tag is present for client navigation", Boolean(metaNonce));

await page.getByRole("link", { name: /library/i }).first().click().catch(() => {});
await page.waitForTimeout(600);
const afterNav = await page.evaluate(() => window.__cspViolations ?? []);
record(
  "client-side navigation raises no violation",
  afterNav.length === 0,
  afterNav.map((violation) => violation.directive).join(" | "),
);

record("no CSP error reached the console", consoleErrors.length === 0, consoleErrors[0] ?? "");
record(
  "every resource the pages asked for was served",
  missing.length === 0,
  missing.slice(0, 3).join(" | "),
);

await browser.close();

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
