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

/** The social preview, shipped in `public/` and until now never referenced. */
const OG_IMAGE = `${SITE_ORIGIN}/og.jpg`;

export type SeoInput = {
  title: string;
  description: string;
  /** Path only, leading slash, no query — this is what makes it canonical. */
  path: string;
};

/**
 * Meta tags for a route `head`, including the ones it already set.
 *
 * Returned as one array rather than merged into an existing one, so a route
 * cannot end up with two og:title tags disagreeing with each other.
 */
export function seoMeta({ title, description, path }: SeoInput) {
  const url = canonicalUrl(path);
  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Instrument" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: OG_IMAGE },
    // `summary_large_image` because og.jpg is a wide card. With `summary` the
    // same file is cropped to a square and the wordmark loses its edges.
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: OG_IMAGE },
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
