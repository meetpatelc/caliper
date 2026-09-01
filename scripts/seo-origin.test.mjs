import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  const seo = read("src/lib/seo.ts");
  const image = seo.match(/OG_IMAGE = `\$\{SITE_ORIGIN\}(\/[^`]+)`/)?.[1];
  assert.ok(image, "seo.ts no longer builds OG_IMAGE from SITE_ORIGIN");
  assert.doesNotThrow(() => readFileSync(join(repoRoot, "public", image)), `public${image} is missing`);
});
