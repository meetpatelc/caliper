/**
 * The tags that decide what this site looks like outside this site.
 *
 * Every route set a title, a description, and og:title/og:description, and
 * nothing else: no canonical, no og:url, no og:image, no twitter card. So a
 * link pasted into Slack or a message rendered as bare text, and
 * `public/og.jpg` — a social preview image that has been in the repository the
 * whole time — was referenced from nowhere.
 *
 * The canonical matters more than the preview. Every model page takes its
 * inputs from the query string, so `?force=25&area=1000&length=1000` and
 * `?area=1000&force=25&length=1000` are the same page with different URLs, and
 * a crawler that finds several of them has to guess which to index. Pointing
 * all of them at the bare path settles it.
 *
 * `SITE_ORIGIN` matches the sitemap generator's, which is the other place that
 * has to name the site absolutely — they were separate literals, and a sitemap
 * that disagrees with the canonical tag is worse than either alone.
 */
export const SITE_ORIGIN = "https://instrument-eta.vercel.app";

export type SeoInput = {
  title: string;
  description: string;
  /** Path only, leading slash, no query — this is what makes it canonical. */
  path: string;
};

/**
 * Meta tags for a route `head`.
 *
 * Deliberately just the title and the description, because the share tags are
 * not this file's to emit. `scripts/pwa-shared.mjs` strips every `og:*` and
 * `twitter:*` meta out of the rendered HTML and re-injects its own — it owns
 * the share card, so that one page cannot end up with two og:titles from two
 * places disagreeing.
 *
 * An earlier version of this function emitted the full set. They rendered, the
 * middleware deleted them, and production served three share tags out of
 * twelve. It looked correct in `vite preview`, which is the trap
 * `scripts/serve-build.mjs` exists for.
 *
 * What this file does own is the title, the description and the canonical —
 * and the canonical is now how the share card learns the page's URL, because
 * `<link>` survives the strip and the middleware knows the host but not the
 * path. So `seoLinks` is load-bearing for `og:url`, not decoration.
 */
export function seoMeta({ title, description }: SeoInput) {
  return [
    { title },
    { name: "description", content: description },
  ];
}

/** The `links` half, which cannot go in `meta`. */
export function seoLinks(path: string) {
  return [{ rel: "canonical", href: canonicalUrl(path) }];
}

export function canonicalUrl(path: string): string {
  const clean = path.split("?")[0].split("#")[0];
  const withSlash = clean.startsWith("/") ? clean : `/${clean}`;
  // No trailing slash except at the root, so /about and /about/ do not become
  // two canonical URLs — which is the exact problem this tag exists to solve.
  const trimmed = withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : "/";
  return `${SITE_ORIGIN}${trimmed}`;
}

/**
 * Structured data, kept to things that are true.
 *
 * The temptation with JSON-LD is to reach for the types that earn rich
 * results — `AggregateRating`, `Review`, `Offer` — and every one of them here
 * would be invented. Nobody has rated these models and nothing is for sale.
 * What is true is that this is a free engineering web application, that each
 * model page is one calculator within it, and what that calculator is called.
 * So that is all this says.
 *
 * Emitted as a `<script type="application/ld+json">`, which CSP's `script-src`
 * does not block: it is a data block, never executed. `qa:csp` re-checks that
 * against the built function rather than taking it on faith.
 */
const SITE_NAME = "Instrument";

export function siteJsonLd(description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${SITE_ORIGIN}/`,
    description,
    inLanguage: "en",
  };
}

/**
 * `name` is the model's own name, not the page title.
 *
 * The title carries " · Instrument" so a browser tab and a search result say
 * which site they belong to. Structured data has a field for that already —
 * `isPartOf` — and repeating it in `name` produces "Axial response ·
 * Instrument" as the application's name, which is not what anything is called.
 */
export function toolJsonLd({ name, description, path }: { name: string; description: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url: canonicalUrl(path),
    applicationCategory: "EngineeringApplication",
    // True, and the one claim here a reader might actually want up front.
    isAccessibleForFree: true,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: `${SITE_ORIGIN}/` },
  };
}

/**
 * A head `scripts` entry. Stringified here so callers cannot forget to.
 *
 * `<` becomes `<`, which JSON decodes back to `<`, so a crawler reads the
 * same string either way. The reason is HTML rather than JSON: `JSON.stringify`
 * has no reason to escape a slash, so a value containing `</script>` would end
 * the tag early and spill the rest of the block into the document as markup.
 * Nothing in the catalogue contains that today; this is one line, and the day
 * a title or description does contain it is not the day to find out.
 */
export function jsonLdScript(data: object) {
  return [{ type: "application/ld+json", children: JSON.stringify(data).replaceAll("<", "\\u003c") }];
}

/**
 * A content page that is not a calculator.
 *
 * `AboutPage` and `CollectionPage` are schema.org's own names for exactly what
 * /about and /reference are, so this claims nothing beyond what the pages
 * already say about themselves.
 */
export function pageJsonLd(type: "AboutPage" | "CollectionPage", { title, description, path }: SeoInput) {
  return {
    "@context": "https://schema.org",
    "@type": type,
    name: title.replace(` · ${SITE_NAME}`, ""),
    description,
    url: canonicalUrl(path),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: `${SITE_ORIGIN}/` },
  };
}
