import assert from "node:assert/strict";
import test from "node:test";
import { canonicalUrl, seoLinks, seoMeta, SITE_ORIGIN } from "./seo.ts";

test("the canonical drops the query, which is the whole point", () => {
  // Every model writes its inputs into the query string as they change, so one
  // page has an unbounded number of URLs. Without this a crawler treats each
  // as its own page and splits whatever authority the model has between them.
  assert.equal(canonicalUrl("/tool/axial?force=25&area=1000"), `${SITE_ORIGIN}/tool/axial`);
  assert.equal(canonicalUrl("/tool/axial?area=1000&force=25"), `${SITE_ORIGIN}/tool/axial`);
  assert.equal(canonicalUrl("/tool/axial#results"), `${SITE_ORIGIN}/tool/axial`);
});

test("one path, one canonical, whatever shape it arrives in", () => {
  const expected = `${SITE_ORIGIN}/about`;
  for (const variant of ["/about", "about", "/about/", "/about//", "/about?x=1"]) {
    assert.equal(canonicalUrl(variant), expected, variant);
  }
});

test("the root keeps its slash", () => {
  // Trimming it would produce "https://origin", which is a different URL from
  // the one the sitemap lists.
  assert.equal(canonicalUrl("/"), `${SITE_ORIGIN}/`);
});

test("a route gets exactly one of each tag", () => {
  const meta = seoMeta({ title: "T", description: "D", path: "/about" });
  const names = meta.map((tag) => ("title" in tag ? "title" : tag.name));
  assert.deepEqual(names, ["title", "description"]);
});

test("this file does not emit share tags, because it does not own them", () => {
  /*
   * scripts/pwa-shared.mjs strips every og:* and twitter:* meta out of the
   * rendered HTML and re-injects its own. An earlier version of seoMeta
   * emitted the full set: they rendered, the middleware deleted them, and
   * production served three share tags out of twelve. It looked right in
   * `vite preview`, which is the trap scripts/serve-build.mjs exists for.
   *
   * So this is not a style rule. Anything added here matching og:/twitter:
   * will be silently discarded in production and nowhere else.
   */
  const serialised = JSON.stringify(seoMeta({ title: "T", description: "D", path: "/about" }));
  assert.doesNotMatch(serialised, /og:/);
  assert.doesNotMatch(serialised, /twitter:/);
});

test("the canonical link is what carries the page's URL into the share card", () => {
  // pwa-shared reads og:url out of this link, because it is handed the host
  // but never the path. A <link> survives the meta strip; a <meta> would not.
  const links = seoLinks("/tool/beam");
  assert.deepEqual(links, [{ rel: "canonical", href: `${SITE_ORIGIN}/tool/beam` }]);
});

test("the canonical is absolute", () => {
  // A relative canonical resolves against whatever host served the page, which
  // on a preview deployment is the preview's throwaway URL.
  assert.match(seoLinks("/reference")[0].href, /^https:\/\//);
});
