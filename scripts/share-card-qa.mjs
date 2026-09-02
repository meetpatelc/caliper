#!/usr/bin/env node
/**
 * The share card, checked against the built function.
 *
 * This has to run against `scripts/serve-build.mjs` rather than `vite preview`,
 * for the same reason the CSP check does: the tags are not what the routes
 * render. `scripts/pwa-shared.mjs` strips every `og:*` and `twitter:*` meta out
 * of the HTML and re-injects its own, so what a route emits and what a reader
 * receives are two different sets — and only the built function does the strip.
 *
 * That gap is not hypothetical. A route was emitting the full set of share
 * tags, they looked right in `vite preview`, and production served three of
 * twelve. Separately, `og:image` had never been emitted at all on any
 * deployment: the host rule rejected every `*.vercel.app` name, which is right
 * for a preview URL and wrong for this app's production domain, which is one.
 *
 *   node scripts/share-card-qa.mjs [url] [--host instrument-eta.vercel.app]
 *
 * The Host header matters and is spoofed deliberately: the image is gated on
 * the request host matching the site's declared one, so a check that asked
 * localhost would assert the preview behaviour and pass while production was
 * broken.
 */
import { get as httpGet } from "node:http";
import { get as httpsGet } from "node:https";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const site = JSON.parse(readFileSync(join(repoRoot, "src/lib/og/site.json"), "utf8"));

const args = process.argv.slice(2);
const hostFlag = args.indexOf("--host");
const PRODUCTION_HOST = hostFlag >= 0 ? args[hostFlag + 1] : site.host;
const BASE = (args.find((arg) => arg.startsWith("http")) ?? "http://127.0.0.1:8081").replace(/\/$/, "");
const ROUTES = ["/", "/tool/axial", "/tool/fits", "/reference", "/about"];

if (!PRODUCTION_HOST) {
  console.error("No host to check with: src/lib/og/site.json declares none and --host was not given.");
  process.exit(2);
}

/**
 * Fetch with a Host header — `fetch` treats that name as forbidden.
 *
 * The scheme picks the module. The first version of this always used
 * `node:http`, so pointing it at the deployed https URL returned nothing and
 * every route reported every tag missing, including the ones that had been
 * working for months. It read as a catastrophic regression and was a typo.
 *
 * A body that is not HTML is therefore an error here, not a page with no tags:
 * "the check could not look" and "the page is empty" have to be different
 * outcomes, or this becomes one more thing that passes by seeing nothing.
 */
function fetchWithHost(url, host) {
  const target = new URL(url);
  const get = target.protocol === "https:" ? httpsGet : httpGet;
  return new Promise((resolve, reject) => {
    const request = get(
      {
        hostname: target.hostname,
        port: target.port || (target.protocol === "https:" ? 443 : 80),
        path: target.pathname + target.search,
        // `servername` so TLS SNI matches the Host we are claiming to be,
        // which is the whole point of spoofing it against a real deployment.
        servername: target.protocol === "https:" ? host : undefined,
        headers: { Host: host },
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () => {
          response.destroy();
          if (!/<html|<head|<meta/i.test(body)) {
            reject(new Error(`${response.statusCode} and no HTML (${body.length} bytes)`));
            return;
          }
          resolve(body);
        });
      },
    );
    request.on("error", reject);
    request.setTimeout(15000, () => {
      request.destroy();
      reject(new Error("timed out"));
    });
  });
}

function shareTags(html) {
  const found = new Map();
  const duplicates = [];
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!key || !/^(og:|twitter:|x:)/.test(key)) continue;
    const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
    if (found.has(key)) duplicates.push(key);
    else found.set(key, content);
  }
  return { found, duplicates };
}

const REQUIRED = ["og:title", "og:description", "og:url", "og:image", "og:site_name", "og:type", "twitter:card", "twitter:title", "twitter:image"];

const findings = [];
function record(name, ok, detail) {
  findings.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

for (const route of ROUTES) {
  let html;
  try {
    html = await fetchWithHost(BASE + route, PRODUCTION_HOST);
  } catch (error) {
    record(`${route} responds`, false, error instanceof Error ? error.message : String(error));
    continue;
  }
  const { found, duplicates } = shareTags(html);
  const missing = REQUIRED.filter((key) => !found.get(key));
  record(`${route} carries a complete share card`, missing.length === 0, missing.join(", "));
  record(`${route} has no duplicated share tag`, duplicates.length === 0, duplicates.join(", "));

  // og:url is what stops a crawler treating one model's query-string variants
  // as separate pages, so it has to be this page rather than the site root.
  const canonical = html.match(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']+)["']/i)?.[1];
  record(
    `${route} agrees with its own canonical`,
    Boolean(canonical) && found.get("og:url") === canonical,
    `og:url ${found.get("og:url") ?? "—"} vs canonical ${canonical ?? "—"}`,
  );

  const image = found.get("og:image") ?? "";
  record(`${route} names an absolute share image`, image.startsWith(`https://${PRODUCTION_HOST}/`), image || "—");

  /*
   * Structured data, parsed rather than pattern-matched.
   *
   * JSON-LD fails silently in the worst way: a trailing comma or an unescaped
   * quote makes the whole block invisible to a crawler while the page looks
   * perfect to everyone else. Nothing in a browser complains — it is a data
   * block, never executed — so the only way to know is to parse it, and the
   * only place worth parsing it is the built output, since the description it
   * carries is interpolated at render time.
   */
  const block = html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (!block) {
    record(`${route} carries structured data`, false, "no ld+json block");
  } else {
    let parsed = null;
    try {
      parsed = JSON.parse(block);
    } catch (error) {
      record(`${route} structured data parses`, false, error instanceof Error ? error.message : String(error));
    }
    if (parsed) {
      record(`${route} structured data parses`, true, `@type ${parsed["@type"]}`);
      record(
        `${route} structured data points at this page`,
        parsed.url === found.get("og:url"),
        `${parsed.url} vs og:url ${found.get("og:url")}`,
      );
      // The page title carries " · Instrument" so a tab says which site it is.
      // Structured data has isPartOf for that, and repeating it in `name`
      // makes the application's name something nothing is actually called.
      record(
        `${route} structured data names the thing, not the tab`,
        typeof parsed.name === "string" && !parsed.name.includes("·"),
        String(parsed.name),
      );
    }
  }
}

/*
 * A preview deployment must not advertise the production card: its URL is a
 * throwaway, and the rule keeping it out is the same one that used to keep
 * production out. Worth pinning, because relaxing that rule is exactly how the
 * og:image fix could go too far.
 *
 * Only against a local server, though. A real deployment sits behind an edge
 * that routes on Host, so a made-up one is refused there before the app ever
 * runs — the assertion is not answerable, and pretending otherwise would make
 * this fail for a reason that has nothing to do with the code.
 */
const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/|$)/.test(BASE);
if (isLocal) {
  const previewHtml = await fetchWithHost(BASE + "/", "instrument-some-preview-hash.vercel.app").catch((error) => {
    record("the preview probe reached the server", false, error instanceof Error ? error.message : String(error));
    return "";
  });
  const previewTags = shareTags(previewHtml).found;
  record("a preview host emits no share image", !previewTags.get("og:image"), previewTags.get("og:image") ?? "none");
} else {
  console.log("SKIP  a preview host emits no share image — the edge routes on Host, so this is only answerable locally");
}

const failed = findings.filter((item) => !item.ok);
console.log(`\n${findings.length - failed.length}/${findings.length} passed against ${BASE} as ${PRODUCTION_HOST}`);
process.exit(failed.length ? 1 : 0);
