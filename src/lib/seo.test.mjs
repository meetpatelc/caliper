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
  const names = meta.map((tag) => tag.property ?? tag.name ?? "title");
  assert.equal(new Set(names).size, names.length, `duplicate tags: ${names.join(", ")}`);
  assert.ok(names.includes("og:url"));
  assert.ok(names.includes("og:image"));
  assert.ok(names.includes("twitter:card"));
});

test("og:url and the canonical link agree", () => {
  // Two tags making the same claim in two places, which is exactly how they
  // drift apart.
  const path = "/tool/beam";
  const ogUrl = seoMeta({ title: "T", description: "D", path }).find((tag) => tag.property === "og:url")?.content;
  assert.equal(ogUrl, seoLinks(path)[0].href);
});

test("every URL it produces is absolute", () => {
  const meta = seoMeta({ title: "T", description: "D", path: "/reference" });
  for (const tag of meta) {
    const value = tag.content ?? "";
    if (/^(og:url|og:image|twitter:image)$/.test(tag.property ?? tag.name ?? "")) {
      assert.match(value, /^https:\/\//, `${tag.property ?? tag.name} was ${value}`);
    }
  }
});
