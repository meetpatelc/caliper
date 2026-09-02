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
