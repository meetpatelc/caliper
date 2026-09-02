import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (relative) => readFileSync(join(repoRoot, relative), "utf8");

test("the sitemap and the canonical tags name the same origin", () => {
  // Two places have to name this site absolutely, and they are in different
  // languages in different directories. A sitemap that says one origin while
  // every canonical tag says another tells a crawler two different things
  // about the same page — worse than either alone, and invisible from inside
  // the app, where both are just strings that look right.
  const fromSeo = read("src/lib/seo.ts").match(/SITE_ORIGIN\s*=\s*"([^"]+)"/)?.[1];
  const fromSitemap = read("scripts/build-sitemap.mjs").match(/SITE_ORIGIN \|\| "([^"]+)"/)?.[1];
  assert.ok(fromSeo, "src/lib/seo.ts no longer declares SITE_ORIGIN");
  assert.ok(fromSitemap, "scripts/build-sitemap.mjs no longer declares an origin fallback");
  assert.equal(fromSeo, fromSitemap);
});

test("robots.txt points at a sitemap on that same origin", () => {
  const fromSeo = read("src/lib/seo.ts").match(/SITE_ORIGIN\s*=\s*"([^"]+)"/)?.[1];
  const sitemapLine = read("public/robots.txt").match(/Sitemap:\s*(\S+)/)?.[1];
  assert.ok(sitemapLine, "robots.txt no longer names a sitemap");
  assert.ok(
    sitemapLine.startsWith(fromSeo),
    `robots.txt points at ${sitemapLine}, which is not on ${fromSeo}`,
  );
});

test("the social preview image referenced in the tags is actually shipped", () => {
  // og.jpg sat in public/ referenced from nowhere for the whole life of the
  // project. The opposite mistake — a tag pointing at a file that is not
  // there — costs a broken preview on every link anyone shares.
  // The card is emitted by scripts/pwa-shared.mjs, which finds it by statting
  // public/ at build time and baking the path into the server bundle. If
  // neither file is there the bake deliberately drops `card: custom` rather
  // than point at a 404 — so the tag quietly disappears instead of breaking,
  // which is exactly the kind of absence nothing notices.
  assert.ok(
    ["og.jpg", "og.png"].some((name) => existsSync(join(repoRoot, "public", name))),
    "neither public/og.jpg nor public/og.png exists, so no share image will be emitted",
  );
});

test("the share card names the same host as the canonical tags", () => {
  // A fourth place the site names itself. src/lib/og/site.json is what lets a
  // .vercel.app host through as public -- previews are rejected by not
  // matching it -- so if it drifts from SITE_ORIGIN the share image silently
  // stops being emitted, which is the state it was already in.
  const fromSeo = read("src/lib/seo.ts").match(/SITE_ORIGIN\s*=\s*"([^"]+)"/)?.[1];
  const site = JSON.parse(read("src/lib/og/site.json"));
  assert.ok(fromSeo, "src/lib/seo.ts no longer declares SITE_ORIGIN");
  assert.ok(site.host, "site.json no longer declares a host");
  assert.equal(new URL(fromSeo).host, site.host);
});
