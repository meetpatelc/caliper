import assert from "node:assert/strict";
import test from "node:test";
import { canonicalUrl, jsonLdScript, pageJsonLd, seoLinks, seoMeta, siteJsonLd, SITE_ORIGIN, toolJsonLd } from "./seo.ts";

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

test("structured data claims only what is true", () => {
  // The pull with JSON-LD is toward the types that earn rich results.
  // AggregateRating and Offer would both be invented here: nobody has rated
  // these models and nothing is for sale. If either appears, someone reached.
  const serialised = JSON.stringify([
    siteJsonLd("D"),
    toolJsonLd({ name: "Axial response", description: "D", path: "/tool/axial" }),
    pageJsonLd("AboutPage", { title: "About & limits · Instrument", description: "D", path: "/about" }),
  ]);
  for (const invented of ["aggregateRating", "review", "offers", "price", "ratingValue"]) {
    assert.doesNotMatch(serialised, new RegExp(invented, "i"), `${invented} cannot be known from this codebase`);
  }
});

test("structured data agrees with the canonical", () => {
  const path = "/tool/beam";
  assert.equal(toolJsonLd({ name: "Beam", description: "D", path }).url, seoLinks(path)[0].href);
  assert.equal(pageJsonLd("AboutPage", { title: "T", description: "D", path }).url, canonicalUrl(path));
});

test("a page's structured name drops the site suffix", () => {
  // The title carries " · Instrument" so a tab says which site it is. Repeating
  // that in `name` makes the application's name something nothing is called.
  assert.equal(pageJsonLd("AboutPage", { title: "About & limits · Instrument", description: "D", path: "/about" }).name, "About & limits");
  assert.doesNotMatch(toolJsonLd({ name: "Axial response", description: "D", path: "/x" }).name, /·/);
});

test("the script entry is valid JSON a crawler can read", () => {
  // A trailing comma or an unescaped quote makes the whole block invisible to a
  // crawler while the page looks perfect. Nothing in a browser complains.
  const [entry] = jsonLdScript(toolJsonLd({ name: 'Quote " and \\ backslash and </script>', description: "D", path: "/x" }));
  assert.equal(entry.type, "application/ld+json");
  assert.doesNotThrow(() => JSON.parse(entry.children));
  assert.equal(JSON.parse(entry.children).name, 'Quote " and \\ backslash and </script>');
});

test("a value that could close the script tag cannot", () => {
  // JSON.stringify has no reason to escape a slash, so "</script>" inside a
  // value would end the tag early and spill the rest into the document as
  // markup. The escape is JSON-level, so a crawler still reads the same string.
  const [entry] = jsonLdScript({ name: "danger </script><img src=x>" });
  assert.doesNotMatch(entry.children, /<\/script/i);
  assert.doesNotMatch(entry.children, /</);
  assert.equal(JSON.parse(entry.children).name, "danger </script><img src=x>");
});
