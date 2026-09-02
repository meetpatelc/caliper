/**
 * Single source of truth for head chrome (PWA, OG share cards), shared by the
 * Vite plugin and Nitro middleware. Plain ESM so `node --test` and the Nitro
 * bundler can both consume it. Injects no third-party scripts.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_APP_NAME = "Instrument";
export const OG_SITE_REL_PATH = "src/lib/og/site.json";

const SHARE_META_KEYS = new Set([
  "og:title",
  "og:description",
  "og:image",
  "og:image:width",
  "og:image:height",
  "og:type",
  "og:url",
  "og:site_name",
  "twitter:card",
  "twitter:title",
  "twitter:image",
  "twitter:description",
  "x:game:image",
  "x:game:image:width",
  "x:game:image:height",
]);

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Inverse of escapeHtml. Decode &amp; last so a single pass undoes one encode. */
function unescapeHtml(value) {
  return String(value)
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

/**
 * Vercel's own preview and system hostnames.
 *
 * They are real, resolvable hosts, so they pass every other check here — and
 * they are the wrong origin for a share card, because the URL changes on every
 * deployment and stops resolving when that preview is cleaned up.
 */
function isVercelSystemHost(host) {
  return (
    host === "vercel.app" ||
    host.endsWith(".vercel.app") ||
    host === "vercel.com" ||
    host.endsWith(".vercel.com")
  );
}

export function publicAppHost(hostHeader) {
  const host = String(hostHeader ?? "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();
  if (!host || !/^[a-z0-9.-]+$/.test(host) || !host.includes(".")) return "";
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return "";
  if (isVercelSystemHost(host)) return "";
  return host;
}

/**
 * `VITE_PUBLIC_HOSTNAME` when the deployment sets one, otherwise the request
 * host / X-Forwarded-Host. The env wins because a proxy may rewrite Host.
 *
 * `site.host` is the third source, and it is the one that made share images
 * work. `publicAppHost` rejects every `*.vercel.app` name, which is right for
 * a preview deployment — its URL is a throwaway and baking it into a share
 * card outlives the deployment. But this app's *production* domain is also a
 * `.vercel.app` name, so the rule rejected it too: `publicHost` was always
 * empty, and `og:image` was therefore never emitted on any deployment. The
 * share card has never had a picture.
 *
 * So a `.vercel.app` host passes when it is the one the site declares as its
 * own in `src/lib/og/site.json`. Previews still get nothing, because their
 * host is not that one.
 */
export function resolvePublicHost(hostHeader, site = {}) {
  const fromEnv = publicAppHost(process.env?.VITE_PUBLIC_HOSTNAME);
  if (fromEnv) return fromEnv;
  const declared = String(site.host ?? "").trim().toLowerCase();
  const requested = String(hostHeader ?? "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();
  if (declared && requested === declared) return declared;
  return publicAppHost(hostHeader);
}

export function isInstallQuery(url) {
  const query = String(url ?? "").split("?", 2)[1] ?? "";
  const params = new URLSearchParams(query);
  const install = params.get("install");
  const platform = (params.get("platform") ?? "").toLowerCase();
  return (install === "1" || install === "true") && platform === "ios";
}

/** Paths that can carry an app document (vs assets / API / internals). */
export function isDocumentPath(pathname) {
  const path = String(pathname ?? "");
  return (
    !path.startsWith("/__pwa/") &&
    !path.startsWith("/api/") &&
    !path.startsWith("/@") &&
    !path.startsWith("/node_modules") &&
    !/\.[a-z0-9]+$/i.test(path)
  );
}

export function acceptsHtml(accept) {
  const value = String(accept ?? "");
  return value === "" || value.includes("text/html") || value.includes("*/*");
}

/** The same URL without the install-tutorial params (used as the app link). */
export function stripInstallParams(url) {
  const [path = "/", query = ""] = String(url ?? "/").split("?", 2);
  const params = new URLSearchParams(query);
  params.delete("install");
  params.delete("platform");
  const rest = params.toString();
  return rest ? `${path}?${rest}` : path;
}

// `host` is accepted and ignored: callers pass it, and the app name no longer
// depends on where it is served from.
export function renderInstallPageHtml(template, { host: _host, url } = {}) {
  return String(template)
    .replaceAll("{{APP_NAME}}", escapeHtml(DEFAULT_APP_NAME))
    .replaceAll("{{APP_URL}}", escapeHtml(stripInstallParams(url)));
}

export function renderWebManifest(_hostHeader) {
  const name = DEFAULT_APP_NAME;
  return JSON.stringify(
    {
      name,
      short_name: name,
      id: "/",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#000000",
      theme_color: "#000000",
      icons: [
        {
          src: "/__pwa/icon-180.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
    null,
    2,
  );
}

export function pwaHeadTags(appName = DEFAULT_APP_NAME) {
  return [
    // Standalone display comes from the manifest ("display": "standalone");
    // the legacy *-web-app-capable metas it replaces are deliberately absent.
    ["manifest", '<link rel="manifest" href="/__pwa/manifest.webmanifest">'],
    ["apple-touch-icon", '<link rel="apple-touch-icon" href="/__pwa/icon-180.png">'],
    [
      "apple-mobile-web-app-title",
      `<meta name="apple-mobile-web-app-title" content="${escapeHtml(appName)}">`,
    ],
    [
      "apple-mobile-web-app-status-bar-style",
      '<meta name="apple-mobile-web-app-status-bar-style" content="black">',
    ],
    ["theme-color", '<meta name="theme-color" content="#000000">'],
  ];
}

export function readXCreator() {
  const fromProcess = typeof process !== "undefined" ? process.env?.X_CREATOR : "";
  return String(fromProcess ?? "").trim();
}

export function readXCreatorId() {
  const fromProcess = typeof process !== "undefined" ? process.env?.X_CREATOR_ID : "";
  return String(fromProcess ?? "").trim();
}

export function xCreatorHeadTags(creator = readXCreator(), creatorId = readXCreatorId()) {
  const name = String(creator ?? "").trim();
  const id = String(creatorId ?? "").trim();
  if (!name || !id) return [];
  return [
    `<meta property="x:creator" content="${escapeHtml(name)}">`,
    `<meta property="x:creator:id" content="${escapeHtml(id)}">`,
  ];
}

export function readOgSite(cwd = process.cwd()) {
  try {
    const raw = readFileSync(join(cwd, OG_SITE_REL_PATH), "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Public path of an on-disk share card, or "" if neither file exists. */
export function ogCardPublicPath(cwd = process.cwd()) {
  if (existsSync(join(cwd, "public/og.jpg"))) return "/og.jpg";
  if (existsSync(join(cwd, "public/og.png"))) return "/og.png";
  return "";
}

function detectCustomOgCard(cwd = process.cwd(), site = {}) {
  if (ogCardPublicPath(cwd)) return true;
  // Vercel runtime has no public/: trust a bake that already saw the file.
  return siteHasCustomCard(site) || Boolean(String(site.image ?? "").trim());
}

/** Snapshot for Vite/Nitro to bake into the server bundle (Vercel has no workspace FS). */
export function snapshotOgIdentity(cwd = process.cwd()) {
  const site = { ...readOgSite(cwd) };
  const disk = ogCardPublicPath(cwd);
  if (disk) {
    site.card = "custom";
    site.image = disk;
  } else {
    // site.json `card=custom` without a file must not bake a 404 /og.jpg URL.
    if (siteHasCustomCard(site)) delete site.card;
    if (site.image) delete site.image;
  }
  if (existsSync(join(cwd, "public/x-banner.jpg"))) {
    site.banner = site.banner || "/x-banner.jpg";
  }
  return { site };
}

export function customOgAssetPath(cwd = process.cwd()) {
  return ogCardPublicPath(cwd) || "/og.jpg";
}

export function titleFromDocument(html) {
  const match = String(html ?? "").match(/<title\b[^>]*>([^<]*)<\/title>/i);
  return match ? unescapeHtml(match[1]).trim() : "";
}

/**
 * The page's own description, read before `stripShareMetaTags` removes it.
 * Prefers an explicit og:description, falls back to the plain description a
 * route sets, so a page that describes itself keeps describing itself in a
 * link preview.
 */
export function descriptionFromDocument(html) {
  const source = String(html ?? "");
  const og = source.match(
    /<meta\b[^>]*\bproperty\s*=\s*["']og:description["'][^>]*\bcontent\s*=\s*["']([^"']*)["'][^>]*>/i,
  );
  if (og) return unescapeHtml(og[1]).trim();
  const plain = source.match(
    /<meta\b[^>]*\bname\s*=\s*["']description["'][^>]*\bcontent\s*=\s*["']([^"']*)["'][^>]*>/i,
  );
  return plain ? unescapeHtml(plain[1]).trim() : "";
}

/**
 * The page's canonical URL, for `og:url`.
 *
 * Read out of the document rather than built here, because this file is given
 * the host but never the path. `<link rel="canonical">` survives
 * `stripShareMetaTags` — that only removes `<meta>` — so unlike the title and
 * the description this one does not have to be read before the strip. It is
 * read alongside them anyway, so the three stay in one place.
 */
export function canonicalFromDocument(html) {
  const match = String(html ?? "").match(
    /<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*\bhref\s*=\s*["']([^"']*)["'][^>]*>/i,
  );
  if (match) return unescapeHtml(match[1]).trim();
  // Attribute order is not guaranteed: TanStack emits rel first today, but a
  // href-first tag is the same tag and this should not depend on that.
  const reversed = String(html ?? "").match(
    /<link\b[^>]*\bhref\s*=\s*["']([^"']*)["'][^>]*\brel\s*=\s*["']canonical["'][^>]*>/i,
  );
  return reversed ? unescapeHtml(reversed[1]).trim() : "";
}

export function resolveOgTitle(
  site = {},
  appName = DEFAULT_APP_NAME,
  _host = "",
  documentTitle = "",
) {
  const fromSite = String(site.title ?? "").trim();
  if (fromSite) return fromSite;
  const fromDoc = String(documentTitle ?? "").trim();
  if (fromDoc) return fromDoc;
  const fromArg = String(appName ?? "").trim();
  return fromArg || DEFAULT_APP_NAME;
}

export function siteHasCustomCard(site = {}) {
  return String(site.card ?? "").toLowerCase() === "custom";
}

/**
 * Preview: public/og.jpg|png on disk.
 * Vercel: the bake (`card=custom` / `image`) because the function cannot stat public/.
 * Otherwise empty, and no og:image is emitted at all.
 */
export function resolveOgCardAsset(site = {}, cwd = process.cwd()) {
  return ogCardPublicPath(cwd) || (detectCustomOgCard(cwd, site) ? String(site.image ?? "").trim() || "/og.jpg" : "");
}

/** Stamp `card=custom` when public/og.jpg or public/og.png is on disk. */
function applyCustomCardFromFs(site, cwd) {
  const disk = ogCardPublicPath(cwd);
  if (!disk) return site;
  return { ...site, card: "custom", image: disk };
}

export function ogHeadTags({
  host = "",
  appName = DEFAULT_APP_NAME,
  site = {},
  documentTitle = "",
  documentDescription = "",
  documentCanonical = "",
  cwd = process.cwd(),
} = {}) {
  // The page wins. `site.title` is the app's name, which is the right answer
  // only for a page that has not named itself — every route here does, and a
  // shared link is worth nothing if every one of them previews as "Instrument".
  const title =
    String(documentTitle ?? "").trim() || resolveOgTitle(site, appName, host);
  const publicHost = resolvePublicHost(host, site);
  const tags = [
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:site_name" content="${escapeHtml(appName)}">`,
    // Every route here is a page, not an article or a profile, and a card with
    // no type at all is treated as `website` by some readers and skipped by
    // others. Saying it is cheaper than finding out which.
    `<meta property="og:type" content="website">`,
  ];
  const description =
    String(documentDescription ?? "").trim() || String(site.description ?? "").trim();
  if (description) {
    tags.push(`<meta property="og:description" content="${escapeHtml(description)}">`);
  }
  /*
   * `og:url` comes from the page's own canonical link.
   *
   * This function is handed the host but not the path, so it could not build
   * the URL itself — and og:url is the tag that stops a crawler treating
   * `?force=25&area=1000` and the same values in another order as two pages.
   * The canonical is already in the document, survives `stripShareMetaTags`
   * because it is a <link> rather than a <meta>, and is by definition the
   * answer. Read it the way the title and description are read.
   */
  const canonical = String(documentCanonical ?? "").trim();
  if (canonical) tags.push(`<meta property="og:url" content="${escapeHtml(canonical)}">`);
  // Twitter reads og:title and og:description when its own are absent, but not
  // reliably once a twitter:card is declared — and one is, on the line above.
  tags.push(`<meta name="twitter:title" content="${escapeHtml(title)}">`);
  if (description) {
    tags.push(`<meta name="twitter:description" content="${escapeHtml(description)}">`);
  }
  if (String(site.type ?? "").toLowerCase() === "x:game") {
    tags.push(`<meta property="og:type" content="x:game">`);
  }
  const asset = publicHost ? resolveOgCardAsset(site, cwd) : "";
  if (publicHost && asset) {
    const image = `https://${publicHost}${asset.startsWith("/") ? asset : `/${asset}`}`;
    tags.push(`<meta property="og:image" content="${escapeHtml(image)}">`);
    tags.push(`<meta property="og:image:width" content="1200">`);
    tags.push(`<meta property="og:image:height" content="630">`);
    // A summary_large_image card with no twitter:image falls back to og:image
    // in most readers and to nothing in some. The card was declared large on
    // the first line of this list, so give it the picture it promises.
    tags.push(`<meta name="twitter:image" content="${escapeHtml(image)}">`);
    const banner = String(site.banner ?? "").trim();
    if (banner) {
      const bannerUrl = `https://${publicHost}${banner.startsWith("/") ? banner : `/${banner}`}`;
      tags.push(`<meta property="x:game:image" content="${escapeHtml(bannerUrl)}">`);
      tags.push(`<meta property="x:game:image:width" content="1200">`);
      tags.push(`<meta property="x:game:image:height" content="264">`);
    }
  }
  return tags;
}

export function stripShareMetaTags(html) {
  return String(html).replace(/<meta\b[^>]*>/gi, (tag) => {
    const attrs = [...tag.matchAll(/\b(?:property|name)\s*=\s*["']([^"']+)["']/gi)];
    for (const match of attrs) {
      if (SHARE_META_KEYS.has(String(match[1]).toLowerCase())) return "";
    }
    return tag;
  });
}

function insertAfterHeadOpen(html, snippet) {
  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/<head\b[^>]*>/i, (open) => `${open}${snippet}`);
  }
  if (/<html\b[^>]*>/i.test(html)) {
    return html.replace(/<html\b[^>]*>/i, (open) => `${open}<head>${snippet}</head>`);
  }
  return `<!doctype html><html><head>${snippet}</head>${html}`;
}

function insertBeforeHeadClose(html, snippet) {
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${snippet}</head>`);
  return insertAfterHeadOpen(html, snippet);
}

export function normalizeHeadContext(ctx = {}) {
  const cwd = ctx.cwd ?? process.cwd();
  // Middleware passes a baked `site`. Still consult the workspace so a
  // public/og.jpg generated after that snapshot, or missed by a wrong cwd, is
  // still found — without it the page ships with no share card at all. Vercel
  // has no public/ to read, so a correct bake is unchanged.
  const site = applyCustomCardFromFs(
    ctx.site !== undefined ? ctx.site : snapshotOgIdentity(cwd).site,
    cwd,
  );
  const appName = resolveOgTitle(site, ctx.appName ?? DEFAULT_APP_NAME, ctx.host ?? "");
  return {
    appName,
    creator: ctx.creator ?? readXCreator(),
    creatorId: ctx.creatorId ?? readXCreatorId(),
    host: ctx.host ?? "",
    cwd,
    site,
  };
}

export function injectPwaHead(html, ctx = {}) {
  if (typeof html !== "string") return html;
  const { site, creator, creatorId, host, cwd } = normalizeHeadContext(ctx);
  const documentTitle = titleFromDocument(html);
  // Read before the strip, which deletes the route's own share meta.
  const documentDescription = descriptionFromDocument(html);
  const documentCanonical = canonicalFromDocument(html);
  const appName = resolveOgTitle(
    site,
    ctx.appName ?? DEFAULT_APP_NAME,
    host,
    documentTitle,
  );
  let next = stripShareMetaTags(html);

  const missing = pwaHeadTags(appName)
    .filter(([key]) => {
      if (key === "manifest") return !next.includes('href="/__pwa/manifest.webmanifest"');
      if (key === "apple-touch-icon") return !next.includes('href="/__pwa/icon-180.png"');
      return !next.includes(`name="${key}"`);
    })
    .map(([, tag]) => tag);

  next = insertAfterHeadOpen(
    next,
    ogHeadTags({ host, appName, site, documentTitle, documentDescription, documentCanonical, cwd }).join(""),
  );

  // No platform script and no platform attribution: the page is first-party.
  const creatorTags = xCreatorHeadTags(creator, creatorId);
  if (creatorTags.length > 0) {
    const hasCreator =
      next.includes('property="x:creator" content=') ||
      next.includes("property='x:creator' content=");
    if (!hasCreator) missing.push(creatorTags[0]);
    if (!next.includes('property="x:creator:id"')) missing.push(creatorTags[1]);
  }

  if (missing.length === 0) return next;
  return insertBeforeHeadClose(next, missing.join(""));
}

function findHeadClose(buf) {
  const at = buf.toString("latin1").search(/<\/head>/i);
  return at;
}

/**
 * Streaming head injector: buffers only until `</head>` (ASCII marker; never
 * appears inside a UTF-8 continuation byte), overwrites share-card metas,
 * then passes later chunks through so streaming SSR keeps streaming.
 */
export function createHeadInjector(ctx = {}) {
  const normalized = normalizeHeadContext(ctx);

  /** @type {Buffer[]} */
  let pending = [];
  let done = false;

  const apply = (html) =>
    injectPwaHead(html, {
      appName: normalized.appName,
      creator: normalized.creator,
      creatorId: normalized.creatorId,
      host: normalized.host,
      cwd: normalized.cwd,
      site: normalized.site,
    });

  return {
    /** @param {Uint8Array | string} chunk @returns {Buffer[]} chunks ready to emit */
    push(chunk) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      if (done) return [buf];
      pending.push(buf);
      const joined = Buffer.concat(pending);
      const at = findHeadClose(joined);
      if (at === -1) return [];
      done = true;
      pending = [];
      const closeLen = joined.toString("latin1", at).match(/^<\/head>/i)[0].length;
      const head = apply(joined.subarray(0, at + closeLen).toString("utf8"));
      return [Buffer.concat([Buffer.from(head, "utf8"), joined.subarray(at + closeLen)])];
    },
    /** @returns {Buffer[]} whatever is still buffered (no `</head>` seen) */
    flush() {
      if (done || pending.length === 0) return [];
      const rest = Buffer.concat(pending);
      pending = [];
      done = true;
      return [Buffer.from(apply(rest.toString("utf8")), "utf8")];
    },
  };
}
