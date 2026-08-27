#!/usr/bin/env node
/**
 * Write the Content-Security-Policy into the build output.
 *
 * The policy is generated rather than hand-written for one reason: the pre-paint
 * theme script is inline and must be, so `script-src` needs its SHA-256. That
 * script interpolates the theme key and both theme colours, so a hash typed
 * into vercel.json goes stale the next time a colour changes — and the symptom
 * is subtle. The script is silently blocked, so the page flashes the wrong
 * theme on every load, in production only, with nothing failing.
 *
 * Hashing the exact string the app renders removes that whole class.
 *
 * Enforcing by default, after report-only shipped and was checked against the
 * deployed site: nine routes, client-side route transitions (so the dynamic
 * imports), Google Fonts actually applied, the record page, and sign-in — zero
 * violations. `src` contains no WebAssembly, which is the usual thing this
 * policy blocks silently, and every fetch the app makes is same-origin, which
 * `connect-src 'self'` already covers.
 *
 * The gap, stated because it is the one that would bite: signed-in traffic was
 * not exercised. Its server calls are same-origin like the rest, so the policy
 * should hold, but nobody has watched it.
 *
 * Set CSP_REPORT_ONLY=1 to go back to reporting without enforcing. A policy
 * that breaks the app is worse than none, so that escape hatch stays.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const CONFIG = ".vercel/output/config.json";

/** The one place the inline script's source lives, so the hash cannot drift. */
export function themeScriptSource() {
  const ts = readFileSync("src/lib/theme-init.ts", "utf8");
  const instrument = readFileSync("src/lib/instrument.ts", "utf8");
  const literal = ts.match(/return `([\s\S]*?)`;/);
  if (!literal) throw new Error("themeInitScript literal not found — csp.mjs and theme-init.ts have diverged.");
  const value = (name) => {
    const direct = instrument.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`));
    if (direct) return direct[1];
    throw new Error(`Could not read ${name} from instrument.ts`);
  };
  const light = instrument.match(/light:\s*"([^"]*)"/);
  const dark = instrument.match(/dark:\s*"([^"]*)"/);
  if (!light || !dark) throw new Error("Could not read THEME_COLOR from instrument.ts");
  return literal[1]
    .replaceAll("${THEME_KEY}", value("THEME_KEY"))
    .replaceAll("${THEME_COLOR.dark}", dark[1])
    .replaceAll("${THEME_COLOR.light}", light[1]);
}

export function buildPolicy(scriptHash) {
  return [
    "default-src 'self'",
    // The inline theme script by hash. Nothing else inline is permitted.
    `script-src 'self' '${scriptHash}'`,
    // Google Fonts serves the stylesheet; 'unsafe-inline' is required because
    // the UI libraries in use (sonner, cmdk, recharts) inject <style> at
    // runtime. Narrowing this means replacing those, not tightening a header.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    // data: covers inline SVG sketches. https: is here for one reason only —
    // account avatars come from whatever origin the provider hands back.
    "img-src 'self' data: https:",
    "connect-src 'self'",
    // Modernises the X-Frame-Options above it, which is kept for older agents.
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

function main() {
  const hash = `sha256-${createHash("sha256").update(themeScriptSource(), "utf8").digest("base64")}`;
  const policy = buildPolicy(hash);
  const key =
    process.env.CSP_REPORT_ONLY === "1" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";

  if (!existsSync(CONFIG)) {
    console.log("[csp] no build output — skipping");
    return;
  }
  const config = JSON.parse(readFileSync(CONFIG, "utf8"));
  config.routes ??= [];
  // Header routes must precede the filesystem handler, or the static handler
  // answers first and the header never attaches.
  // Match either key: switching between enforce and report-only must replace
  // the previous rule, not add a second one that also matches every path.
  const existing = config.routes.findIndex(
    (route) =>
      route.headers &&
      (route.headers["Content-Security-Policy"] || route.headers["Content-Security-Policy-Report-Only"]),
  );
  const rule = { src: "/(.*)", headers: { [key]: policy }, continue: true };
  if (existing >= 0) config.routes[existing] = rule;
  else config.routes.unshift(rule);
  writeFileSync(CONFIG, JSON.stringify(config, null, 2));
  console.log(`[csp] ${key} written, theme script ${hash}`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("csp.mjs")) main();
