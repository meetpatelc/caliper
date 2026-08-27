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
 * Report-only by default. It was briefly enforced and that broke production:
 * the app never hydrated, because `script-src` with a single hash does not
 * cover the inline scripts TanStack Start emits for the hydration payload and
 * router state. Those carry their own hashes, and their content changes with
 * the page, so hashing them is not a fix either — this needs a per-request
 * nonce threaded through the SSR response, which is a real change and not a
 * header tweak.
 *
 * The check that cleared it was worthless, and worth recording: a
 * `securitypolicyviolation` listener attached from the console after load
 * cannot see violations raised while the document was parsing, which is when
 * every one of these fires. It reported zero because it was structurally
 * incapable of reporting anything else. Read the console, or the
 * `report-only` header's own reports — do not roll your own listener late.
 *
 * Set CSP_ENFORCE=1 to enforce, once the nonce work is done and verified from
 * a cold load rather than from a listener added afterwards.
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
  const key = process.env.CSP_ENFORCE === "1" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";

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
