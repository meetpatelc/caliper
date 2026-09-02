#!/usr/bin/env node
/**
 * Text contrast across the app, in both themes.
 *
 * An outside review reported dark-theme text below 4.5:1 without saying which
 * text, so this measures every visible run of text on a set of representative
 * routes: the computed colour against the first opaque background behind it,
 * with the WCAG large-text allowance applied by font size and weight.
 *
 *   npm run qa:contrast                      # against http://127.0.0.1:8080
 *   npm run qa:contrast -- http://host:port
 *
 * Elements are grouped by the colour pair rather than listed one by one — one
 * token combination used in forty places is one decision, not forty findings.
 */
import { chromium } from "playwright";
import { judge } from "./contrast.mjs";

const BASE = process.argv[2] || process.env.UI_QA_BASE_URL || "http://127.0.0.1:8080";
const ROUTES = ["/", "/tool/axial", "/reference", "/about", "/workshop", "/review"];

/**
 * Collect one sample per element that paints its own text.
 *
 * Walking up for the background matters: most text sits on a transparent
 * element inside a panel, and comparing against `rgba(0,0,0,0)` would score
 * every one of them against black and report a page of false failures.
 */
async function sampleRoute(page) {
  return page.evaluate(() => {
    const opaqueBehind = (element) => {
      for (let node = element; node; node = node.parentElement) {
        const colour = getComputedStyle(node).backgroundColor;
        const parts = colour.match(/-?[\d.]+/g);
        if (parts && (parts.length < 4 || Number(parts[3]) >= 0.95)) return colour;
      }
      return getComputedStyle(document.body).backgroundColor;
    };

    const out = [];
    for (const element of document.querySelectorAll("body *")) {
      const text = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent.trim())
        .join(" ")
        .trim();
      if (!text) continue;
      const box = element.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      const style = getComputedStyle(element);
      if (style.visibility === "hidden" || style.opacity === "0") continue;
      out.push({
        color: style.color,
        background: opaqueBehind(element),
        fontSizePx: parseFloat(style.fontSize),
        fontWeight: style.fontWeight,
        sample: text.slice(0, 40),
        where: element.tagName.toLowerCase() + (element.className && typeof element.className === "string" ? "." + element.className.split(/\s+/).slice(0, 2).join(".") : ""),
      });
    }
    return out;
  });
}

/**
 * Wait until the page has stopped changing colour.
 *
 * Switching the theme starts over a thousand transitions at once — the base
 * stylesheet transitions `all` on everything — and they take a beat to flush
 * even with reduced motion, which shortens them rather than removing them.
 * Read during that flush and `getComputedStyle` returns a value on its way
 * somewhere: the footer's paragraph reports the light theme's muted grey while
 * its own parent already reports the dark one, which is impossible in a
 * settled page and is exactly what a half-applied inherit looks like.
 *
 * This cost three false findings and a real scare. A fixed timeout is what
 * produced them — 250ms was enough most of the time, so the check passed about
 * five runs in six and failed the rest with plausible-looking contrast
 * numbers. The dangerous half is the other direction: the same race can land
 * on a passing ratio and hide a genuine failure, and a check that
 * intermittently cannot see the defect looks exactly like a passing one.
 *
 * So poll for quiet rather than guess at it. The cap is a safety net, not a
 * timeout to rely on: a page that still has animations after a second is
 * either genuinely animated or broken, and either way the numbers below are
 * not to be trusted, which is what the returned flag says.
 */
async function settle(page, cap = 2000) {
  const deadline = Date.now() + cap;
  while (Date.now() < deadline) {
    const running = await page.evaluate(() => document.getAnimations().length);
    if (running === 0) {
      // One more frame, so the last transition's final value is committed.
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      return true;
    }
    await page.waitForTimeout(50);
  }
  return false;
}

const browser = await chromium.launch();
const failures = new Map();
let checked = 0;
let unsettled = 0;

try {
  for (const theme of ["light", "dark"]) {
    /*
     * `reducedMotion` shortens the theme transition, using the app's own
     * `prefers-reduced-motion` rule in base.css rather than an injected
     * stylesheet, so this still measures the real page. It shortens rather
     * than removes, which is why `settle` below is the thing that actually
     * makes the reading trustworthy.
     */
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
    for (const route of ROUTES) {
      await page.goto(BASE + route, { waitUntil: "networkidle" });
      // Both classes, the way src/lib/theme.ts paints it. Toggling only "dark"
      // leaves "light" on and produces a state the app itself never has.
      await page.evaluate((wanted) => {
        document.documentElement.classList.toggle("dark", wanted === "dark");
        document.documentElement.classList.toggle("light", wanted !== "dark");
      }, theme);
      if (!(await settle(page))) unsettled += 1;
      for (const sample of await sampleRoute(page)) {
        const verdict = judge(sample);
        if (!verdict) continue;
        checked += 1;
        if (verdict.passes) continue;
        const key = `${theme} ${sample.color} on ${sample.background} @${sample.fontSizePx}px/${sample.fontWeight}`;
        const existing = failures.get(key);
        if (existing) {
          existing.count += 1;
          if (existing.routes.length < 3 && !existing.routes.includes(route)) existing.routes.push(route);
        } else {
          failures.set(key, { ...verdict, key, count: 1, routes: [route], sample: sample.sample, where: sample.where });
        }
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}

const ranked = [...failures.values()].sort((a, b) => a.ratio - b.ratio);
console.log(`${checked} text runs measured across ${ROUTES.length} routes in both themes\n`);
if (unsettled) {
  // Say it rather than quietly reporting numbers taken mid-transition, which
  // is the failure mode this whole settle mechanism exists to remove.
  console.log(`WARNING: ${unsettled} page view(s) never stopped animating; those readings are not reliable.\n`);
}
for (const item of ranked) {
  console.log(`${item.ratio.toFixed(2)}:1 (needs ${item.required}:1)  ×${item.count}  ${item.key}`);
  console.log(`    ${item.where} — "${item.sample}"  [${item.routes.join(" ")}]`);
}
if (!ranked.length) console.log("every text run meets its WCAG minimum");

process.exit(ranked.length ? 1 : 0);
