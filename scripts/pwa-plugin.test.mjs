import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  createHeadInjector,
  xCreatorHeadTags,
  injectPwaHead,
  isDocumentPath,
  isInstallQuery,
  canonicalFromDocument,
  ogHeadTags,
  publicAppHost,
  resolvePublicHost,
  stripShareMetaTags,
  renderWebManifest,
  resolveOgCardAsset,
  snapshotOgIdentity,
  stripInstallParams,
} from "./pwa-shared.mjs";
import { renderInstallPage } from "./pwa-plugin.mjs";

const TEMPLATE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * A cwd with no OG identity. This workspace ships src/lib/og/site.json and
 * public/og.jpg, which by design win title/card resolution — tests exercising
 * the fallbacks must not inherit them.
 */
function emptyCwd() {
  return mkdtempSync(join(tmpdir(), "og-hermetic-"));
}

test("injects before </head>", () => {
  const out = injectPwaHead("<html><head><title>x</title></head><body></body></html>");
  assert.match(out, /rel="manifest"/);
  assert.match(out, /apple-touch-icon/);
  assert.ok(out.indexOf("manifest") < out.indexOf("</head>"));
});

test("never injects the platform extensions script", () => {
  // The page ships first-party only — no third-party script, with or without
  // a project id.
  for (const projectId of ["", "proj-123"]) {
    const out = injectPwaHead("<html><head></head></html>", {
      appName: "Demo",
      projectId,
    });
    assert.doesNotMatch(out, /extensions\.js/);
    assert.doesNotMatch(out, /<script/);
  }
});

test("never emits another platform's attribution metas", () => {
  // The head injector used to add <meta name="grok-project-id"> and
  // <meta property="grok:app_id"> whenever VITE_PROJECT_ID was set. That is
  // another company's attribution on a first-party page, and it is gone --
  // including the plumbing, so there is no env var that brings it back.
  const out = injectPwaHead("<html><head></head></html>", { appName: "Demo", projectId: "proj-123" });
  assert.doesNotMatch(out, /grok/i);
  assert.doesNotMatch(out, /project-id|app_id/i);
});

test("omits x:creator tags without both creator values", () => {
  assert.deepEqual(xCreatorHeadTags("", "42"), []);
  assert.deepEqual(xCreatorHeadTags("@alice", ""), []);
  const out = injectPwaHead("<html><head></head></html>", {
    appName: "Demo",
    projectId: "",
    creator: "@alice",
    creatorId: "",
  });
  assert.doesNotMatch(out, /property="x:creator"/);
});

test("injects x:creator tags when both creator values are set", () => {
  const out = injectPwaHead("<html><head></head></html>", {
    appName: "Demo",
    projectId: "",
    creator: "@alice",
    creatorId: "42",
  });
  assert.match(out, /property="x:creator" content="@alice"/);
  assert.match(out, /property="x:creator:id" content="42"/);
});

test("escapes x:creator values", () => {
  const tags = xCreatorHeadTags('"><script>', '1" onclick="alert(1)');
  assert.equal(
    tags[0],
    '<meta property="x:creator" content="&quot;&gt;&lt;script&gt;">',
  );
  assert.equal(
    tags[1],
    '<meta property="x:creator:id" content="1&quot; onclick=&quot;alert(1)">',
  );
});

test("does not duplicate x:creator tags", () => {
  const ctx = { appName: "Demo", projectId: "", creator: "@alice", creatorId: "42" };
  const once = injectPwaHead("<html><head></head></html>", ctx);
  const twice = injectPwaHead(once, ctx);
  assert.equal(once, twice);
  assert.equal(twice.split('property="x:creator" content=').length - 1, 1);
  assert.equal(twice.split('property="x:creator:id"').length - 1, 1);
});

test("platform chrome overwrites share-card metas and always sets og:title", () => {
  const html =
    '<html><head><title>Hello World</title><meta property="og:title" content="Old"><meta name="twitter:card" content="summary"></head></html>';
  const out = injectPwaHead(html, { appName: "Wild Race", site: {}, cwd: emptyCwd() });
  assert.match(out, /name="twitter:card" content="summary_large_image"/);
  assert.match(out, /property="og:title" content="Hello World"/);
  assert.doesNotMatch(out, /content="Old"/);
  assert.doesNotMatch(out, /content="summary"/);
  assert.equal(out.split('name="twitter:card"').length - 1, 1);
  assert.equal(out.split('property="og:title"').length - 1, 1);
  assert.doesNotMatch(out, /property="og:image"/);
});

test("does not duplicate twitter:card or og:title", () => {
  const once = injectPwaHead("<html><head><title>Hello World</title></head></html>");
  const twice = injectPwaHead(once);
  assert.equal(once, twice);
  assert.equal(twice.split('name="twitter:card"').length - 1, 1);
  assert.equal(twice.split('property="og:title"').length - 1, 1);
});

test("a baked site.image is treated as a custom card", () => {
  const out = injectPwaHead("<html><head></head></html>", {
    host: "wild-race.example.com",
    cwd: mkdtempSync(join(tmpdir(), "og-image-only-")),
    site: { title: "Wild Race", image: "/og.jpg" },
  });
  assert.match(out, /property="og:image" content="https:\/\/wild-race\.example\.com\/og\.jpg"/);
  assert.doesNotMatch(out, /grok/i);
});

test("baked identity does not need a workspace filesystem", () => {
  const empty = mkdtempSync(join(tmpdir(), "og-empty-"));
  const out = injectPwaHead("<html><head></head></html>", {
    host: "wild-race.example.com",
    cwd: empty,
    site: { title: "Pixel Nova", type: "x:game", card: "custom" },
  });
  assert.match(out, /property="og:title" content="Pixel Nova"/);
  assert.match(out, /property="og:type" content="x:game"/);
  assert.match(out, /property="og:image" content="https:\/\/wild-race\.example\.com\/og\.jpg"/);
  assert.doesNotMatch(out, /grok/i);
});

test("a public card file wins over a baked site without card=custom", () => {
  // Deploy middleware always passes a baked `site`. If that snapshot missed
  // the file, public/og.jpg must still be found — otherwise the page ships
  // with no share card at all.
  const root = mkdtempSync(join(tmpdir(), "og-card-"));
  mkdirSync(join(root, "public"));
  writeFileSync(join(root, "public/og.jpg"), "x");
  const out = injectPwaHead("<html><head></head></html>", {
    host: "wild-race.example.com",
    cwd: root,
    site: {},
  });
  assert.match(out, /property="og:image" content="https:\/\/wild-race\.example\.com\/og\.jpg"/);
  assert.doesNotMatch(out, /grok/i);
});

test("public/og.png wins when jpg is absent", () => {
  const root = mkdtempSync(join(tmpdir(), "og-png-"));
  mkdirSync(join(root, "public"));
  writeFileSync(join(root, "public/og.png"), "x");
  const out = injectPwaHead("<html><head></head></html>", {
    host: "wild-race.example.com",
    cwd: root,
    site: { title: "Wild Race" },
  });
  assert.match(out, /property="og:image" content="https:\/\/wild-race\.example\.com\/og\.png"/);
  assert.doesNotMatch(out, /grok/i);
});

test("resolveOgCardAsset: disk file, then bake, then empty", () => {
  const empty = mkdtempSync(join(tmpdir(), "og-none-"));
  assert.equal(resolveOgCardAsset({}, empty), "");
  assert.equal(resolveOgCardAsset({ title: "X" }, empty), "");

  const baked = resolveOgCardAsset({ card: "custom", image: "/og.jpg" }, empty);
  assert.equal(baked, "/og.jpg");

  const root = mkdtempSync(join(tmpdir(), "og-disk-"));
  mkdirSync(join(root, "public"));
  writeFileSync(join(root, "public/og.jpg"), "x");
  assert.equal(resolveOgCardAsset({}, root), "/og.jpg");
  assert.equal(resolveOgCardAsset({ card: "custom", image: "/other.png" }, root), "/og.jpg");
});

test("snapshotOgIdentity stamps card=custom from a public card file", () => {
  const root = mkdtempSync(join(tmpdir(), "og-snap-"));
  mkdirSync(join(root, "public"));
  writeFileSync(join(root, "public/og.jpg"), "x");
  const { site } = snapshotOgIdentity(root);
  assert.equal(site.card, "custom");
  assert.equal(site.image, "/og.jpg");
  assert.equal(site.banner, undefined);
});

test("snapshotOgIdentity stamps banner from public/x-banner.jpg", () => {
  const root = mkdtempSync(join(tmpdir(), "og-banner-"));
  mkdirSync(join(root, "public"));
  writeFileSync(join(root, "public/x-banner.jpg"), "x");
  const { site } = snapshotOgIdentity(root);
  assert.equal(site.banner, "/x-banner.jpg");
});

test("emits x:game:image for a public host when site.banner is set", () => {
  const html = "<html><head><meta property=\"x:game:image\" content=\"old\"></head></html>";
  const out = injectPwaHead(html, {
    host: "wild-race.example.com",
    site: { title: "Wild Race", type: "x:game", card: "custom", banner: "/x-banner.jpg" },
  });
  assert.match(
    out,
    /property="x:game:image" content="https:\/\/wild-race\.example\.com\/x-banner\.jpg"/,
  );
  assert.match(out, /property="x:game:image:width" content="1200"/);
  assert.match(out, /property="x:game:image:height" content="264"/);
  assert.doesNotMatch(out, /content="old"/);
  assert.equal(out.split('property="x:game:image"').length - 1, 1);
});

test("does not emit x:game:image without a public host or banner", () => {
  const noHost = injectPwaHead("<html><head></head></html>", {
    site: { banner: "/x-banner.jpg" },
  });
  assert.doesNotMatch(noHost, /x:game:image/);
  const noBanner = injectPwaHead("<html><head></head></html>", {
    host: "wild-race.example.com",
    site: { type: "x:game", card: "custom" },
  });
  assert.doesNotMatch(noBanner, /x:game:image/);
});

test("site title Instrument is a real name, not a sentinel", () => {
  const out = injectPwaHead("<html><head></head></html>", {
    host: "wild-race.example.com",
    site: { title: "Instrument" },
  });
  assert.match(out, /property="og:title" content="Instrument"/);
});

test("the app is named the same wherever it is served from", () => {
  // The name used to be derived from the first label of a *.grok.me host, so
  // the same build called itself something different depending on the URL. It
  // is one product with one name now, and the host has no say in it.
  const out = injectPwaHead("<html><head></head></html>", {
    host: "wild-race.example.com",
    site: {},
    cwd: emptyCwd(),
  });
  assert.match(out, /property="og:title" content="Instrument"/);
  assert.doesNotMatch(out, /Wild Race/);
});

test("rejects Vercel system hosts as og:image origins", () => {
  assert.equal(publicAppHost("01a020b6-803a-71a2-bb47-e2bec57eb9a2-662k8x1l1-preview.vercel.app"), "");
  assert.equal(publicAppHost("demo.vercel.app:443"), "");
  assert.equal(publicAppHost("vercel.app"), "");
  assert.equal(publicAppHost("wild-race.example.com"), "wild-race.example.com");
});

test("published VITE_PUBLIC_HOSTNAME wins over request Host for og:image", () => {
  const prev = process.env.VITE_PUBLIC_HOSTNAME;
  process.env.VITE_PUBLIC_HOSTNAME = "plum-plaza-reef-dream.example.com";
  try {
    const vercelHost = injectPwaHead("<html><head><title>RACK</title></head></html>", {
      host: "01a020b6-803a-71a2-bb47-e2bec57eb9a2-662k8x1l1-preview.vercel.app",
      site: { title: "RACK", card: "custom" },
    });
    assert.match(
      vercelHost,
      /property="og:image" content="https:\/\/plum-plaza-reef-dream\.example\.com\/og\.jpg"/,
    );
    assert.doesNotMatch(vercelHost, /vercel\.app/);

    const otherPublicHost = injectPwaHead("<html><head><title>RACK</title></head></html>", {
      host: "custom.example.com",
      site: { title: "RACK", card: "custom" },
    });
    assert.match(
      otherPublicHost,
      /property="og:image" content="https:\/\/plum-plaza-reef-dream\.example\.com\/og\.jpg"/,
    );
    assert.doesNotMatch(otherPublicHost, /custom\.example\.com/);
  } finally {
    if (prev === undefined) delete process.env.VITE_PUBLIC_HOSTNAME;
    else process.env.VITE_PUBLIC_HOSTNAME = prev;
  }
});

test("vercel Host without a public hostname emits no og:image", () => {
  const prev = process.env.VITE_PUBLIC_HOSTNAME;
  delete process.env.VITE_PUBLIC_HOSTNAME;
  try {
    const out = injectPwaHead("<html><head><title>RACK</title></head></html>", {
      host: "01a020b6-803a-71a2-bb47-e2bec57eb9a2-662k8x1l1-preview.vercel.app",
      site: { title: "RACK", card: "custom" },
    });
    assert.doesNotMatch(out, /property="og:image"/);
    assert.doesNotMatch(out, /vercel\.app/);
  } finally {
    if (prev === undefined) delete process.env.VITE_PUBLIC_HOSTNAME;
    else process.env.VITE_PUBLIC_HOSTNAME = prev;
  }
});

test("emits og:image only for a custom card on a public host", () => {
  const noCard = injectPwaHead("<html><head></head></html>", {
    appName: "Instrument",
    host: "example.com",
    site: { title: "Instrument" },
    cwd: emptyCwd(),
  });
  assert.doesNotMatch(noCard, /property="og:image"/, "no card, no claim to one");

  const custom = injectPwaHead("<html><head></head></html>", {
    appName: "Instrument",
    host: "example.com",
    site: { title: "Instrument", card: "custom", type: "x:game" },
    cwd: emptyCwd(),
  });
  assert.match(custom, /property="og:image" content="https:\/\/example\.com\/og\.jpg"/);
  assert.match(custom, /property="og:image:width" content="1200"/);
  assert.match(custom, /property="og:type" content="x:game"/);
});

test("no custom card means no og:image at all", () => {
  // There used to be a placeholder card generated by another company's
  // service, tinted from site.color. A share card served from a host this app
  // has no relationship with is worse than no share card: it can change, or
  // stop resolving, and the page cannot tell.
  const out = injectPwaHead("<html><head></head></html>", {
    host: "example.com",
    site: { title: "Anything", color: "#FF4D2E" },
    cwd: emptyCwd(),
  });
  assert.doesNotMatch(out, /property="og:image"/);
  assert.doesNotMatch(out, /card\.png/);
});

test("document title entities are not double-escaped on og:title", () => {
  const out = injectPwaHead(
    "<html><head><title>Cats &amp; Dogs</title></head></html>",
    { site: {}, cwd: emptyCwd() },
  );
  assert.match(out, /property="og:title" content="Cats &amp; Dogs"/);
  assert.doesNotMatch(out, /Cats &amp;amp; Dogs/);
});

test("site.json title wins over the host slug", () => {
  const out = injectPwaHead("<html><head></head></html>", {
    host: "wild-race.example.com",
    site: { title: "Pixel Nova" },
  });
  assert.match(out, /property="og:title" content="Pixel Nova"/);
});

test("injects into documents with no head element", () => {
  const out = injectPwaHead("<html><body>hi</body></html>", {
    appName: "Solo",
    site: {},
    cwd: emptyCwd(),
  });
  assert.match(out, /<head>/);
  assert.match(out, /property="og:title" content="Solo"/);
  assert.match(out, /<\/head>/);
});

test("streaming injector matches </HEAD> case-insensitively", () => {
  const injector = createHeadInjector({ appName: "Wild Race", site: {}, cwd: emptyCwd() });
  const chunks = [
    ...injector.push("<html><HEAD><title>x</title></HE"),
    ...injector.push("AD><body>hello</body></html>"),
  ];
  const out = Buffer.concat(chunks).toString("utf8");
  assert.match(out, /property="og:title" content="x"/);
  assert.match(out, /<body>hello<\/body>/);
});

test("is idempotent", () => {
  const once = injectPwaHead("<html><head></head></html>");
  const twice = injectPwaHead(once);
  assert.equal(once, twice);
});

test("uses the app name in the injected title tag", () => {
  const out = injectPwaHead("<html><head></head></html>", {
    appName: "Wild Race",
    site: {},
    cwd: emptyCwd(),
  });
  assert.match(out, /apple-mobile-web-app-title" content="Wild Race"/);
});

test("streaming injector handles </head> split across chunks", () => {
  const injector = createHeadInjector({ appName: "Wild Race" });
  const chunks = [
    ...injector.push("<html><head><title>x</title></he"),
    ...injector.push("ad><body>hello</body></html>"),
  ];
  const out = Buffer.concat(chunks).toString("utf8");
  assert.match(out, /rel="manifest"/);
  assert.ok(out.indexOf("manifest") < out.indexOf("</head>"));
  assert.match(out, /<body>hello<\/body>/);
  assert.deepEqual(injector.flush(), []);
});

test("streaming injector passes post-head chunks through untouched", () => {
  const injector = createHeadInjector();
  injector.push("<html><head></head>");
  const [tail] = injector.push("<body>tail</body>");
  assert.equal(tail.toString("utf8"), "<body>tail</body>");
});

test("streaming injector falls back when no </head> is seen", () => {
  const injector = createHeadInjector();
  assert.deepEqual(injector.push("<html><head>"), []);
  const out = Buffer.concat(injector.flush()).toString("utf8");
  assert.match(out, /rel="manifest"/);
});

test("detects install query", () => {
  assert.equal(isInstallQuery("/?install=1&platform=ios"), true);
  assert.equal(isInstallQuery("/app?foo=1&install=true&platform=ios"), true);
  assert.equal(isInstallQuery("/?install=1"), false);
  assert.equal(isInstallQuery("/?install=1&platform=android"), false);
  assert.equal(isInstallQuery("/?install=0&platform=ios"), false);
  assert.equal(isInstallQuery("/"), false);
});

test("filters non-document paths", () => {
  assert.equal(isDocumentPath("/"), true);
  assert.equal(isDocumentPath("/app"), true);
  assert.equal(isDocumentPath("/api/thing"), false);
  assert.equal(isDocumentPath("/__pwa/install/styles.css"), false);
  assert.equal(isDocumentPath("/logo.png"), false);
});

test("strips install params from the app link", () => {
  assert.equal(stripInstallParams("/?install=1&platform=ios"), "/");
  assert.equal(stripInstallParams("/app?install=1&platform=ios&tab=2"), "/app?tab=2");
});

test("the install page carries the app name", () => {
  const html = renderInstallPage("wild-race.example.com", "/");
  assert.match(html, /Instrument/);
  assert.doesNotMatch(html, /Wild Race/, "the host is not a name");
});

test("a hostile host cannot reach the install page as a name", () => {
  // This mattered when the host was slugified into the page. It no longer is,
  // which is the strongest version of the fix — but the assertion stays,
  // because "the injection is impossible now" is exactly the claim that
  // quietly stops being true.
  const html = renderInstallPage('"><img src=x onerror=1>.example.com', "/");
  assert.doesNotMatch(html, /<img src=x/);
});

test("renders install page markup", () => {
  const html = renderInstallPage("example.com", "/?install=1&platform=ios");
  assert.match(html, /Add Instrument to your/);
  assert.match(html, /\/__pwa\/install\/styles\.css/);
  assert.match(html, /href="\/"/);
  assert.equal(html.includes("{{APP_NAME}}"), false);
  assert.equal(html.includes("{{APP_URL}}"), false);
});

test("escapes host-derived values in the install page", () => {
  const html = renderInstallPage("<script>alert(1)</script>", "/?install=1&platform=ios");
  assert.equal(html.includes("<script>alert(1)</script>"), false);
});

test("renders the manifest with the app name", () => {
  const manifest = JSON.parse(renderWebManifest("wild-race.example.com"));
  assert.equal(manifest.name, "Instrument");
  assert.equal(manifest.short_name, "Instrument");
  assert.equal(manifest.icons[0].src, "/__pwa/icon-180.png");
});

// Tripwires: the deployed-app path only works if Nitro scans server/ — an
// accidental edit that drops serverDir or the middleware file would otherwise
// fail silently (published apps would just render the app for ?install=1).
test("vite config keeps the nitro serverDir wiring", () => {
  const viteConfig = readFileSync(join(TEMPLATE_ROOT, "vite.config.ts"), "utf8");
  assert.match(viteConfig, /serverDir:\s*"\.\/server"/);
  assert.match(viteConfig, /pwaPlugin\(\)/);
});

test("nitro middleware and its bundled assets exist", () => {
  const middleware = readFileSync(join(TEMPLATE_ROOT, "server/middleware/pwa.ts"), "utf8");
  assert.match(middleware, /install-page\.html\?raw/);
  assert.match(middleware, /virtual:og-identity/);
  readFileSync(join(TEMPLATE_ROOT, "scripts/install-page.html"));
  readFileSync(join(TEMPLATE_ROOT, "public/__pwa/icon-180.png"));
  readFileSync(join(TEMPLATE_ROOT, "public/__pwa/install/styles.css"));
});

test("vite plugin bakes og identity as a virtual module", () => {
  const plugin = readFileSync(join(TEMPLATE_ROOT, "scripts/pwa-plugin.mjs"), "utf8");
  assert.match(plugin, /virtual:og-identity/);
  assert.match(plugin, /snapshotOgIdentity/);
});


// A shared link is only worth sending if its preview says what the page holds.
// The head injector strips the route's own share meta before adding its own, so
// without these the whole site previews as the bare app name — which is how it
// shipped, unnoticed, until a record page made the loss visible.
test("og:title follows the page, not the app name", () => {
  const html = injectPwaHead(
    "<html><head><title>Axial response: 20 MPa · Instrument</title></head><body></body></html>",
    { site: { title: "Instrument" }, host: "example.test" },
  );
  const titles = [...html.matchAll(/<meta property="og:title" content="([^"]*)">/g)].map((m) => m[1]);
  assert.deepEqual(titles, ["Axial response: 20 MPa · Instrument"]);
});

test("og:description survives the strip that removes it", () => {
  const html = injectPwaHead(
    '<html><head><title>Axial response</title><meta name="description" content="Average stress 20 MPa."></head><body></body></html>',
    { site: { title: "Instrument" }, host: "example.test" },
  );
  assert.match(html, /<meta property="og:description" content="Average stress 20 MPa\.">/);
});

test("a page that names nothing still falls back to the app name", () => {
  const html = injectPwaHead("<html><head></head><body></body></html>", {
    site: { title: "Instrument" },
    host: "example.test",
  });
  assert.match(html, /<meta property="og:title" content="Instrument">/);
});

test("the site's own production host is public, a preview's is not", () => {
  // `publicAppHost` rejects every *.vercel.app name, which is right for a
  // preview -- its URL is a throwaway and baking it into a share card outlives
  // the deployment. But this app's production domain is also a .vercel.app
  // name, so the rule rejected that too: publicHost was always empty and
  // og:image was never emitted on any deployment.
  const site = { host: "instrument-eta.vercel.app" };
  assert.equal(resolvePublicHost("instrument-eta.vercel.app", site), "instrument-eta.vercel.app");
  assert.equal(resolvePublicHost("instrument-eta.vercel.app:443", site), "instrument-eta.vercel.app");
  assert.equal(resolvePublicHost("instrument-abc123-preview.vercel.app", site), "");
  assert.equal(resolvePublicHost("instrument-eta.vercel.app", {}), "");
});

test("og:url comes from the page's own canonical link", () => {
  // ogHeadTags is handed the host but never the path, so it cannot build the
  // URL itself -- and og:url is the tag that stops a crawler treating one
  // model's query-string variants as separate pages.
  const html = '<head><link rel="canonical" href="https://example.com/tool/beam"/></head>';
  assert.equal(canonicalFromDocument(html), "https://example.com/tool/beam");
  assert.equal(
    canonicalFromDocument('<link href="https://example.com/x" rel="canonical">'),
    "https://example.com/x",
    "attribute order is not guaranteed",
  );
  assert.equal(canonicalFromDocument("<head></head>"), "");
});

test("a share card carries url, site name, type and both twitter fields", () => {
  const tags = ogHeadTags({
    host: "instrument-eta.vercel.app",
    appName: "Instrument",
    site: { host: "instrument-eta.vercel.app" },
    documentTitle: "Axial response · Instrument",
    documentDescription: "Average stress for a prismatic member.",
    documentCanonical: "https://instrument-eta.vercel.app/tool/axial",
    cwd: "/nonexistent",
  }).join("");
  assert.match(tags, /property="og:url" content="https:\/\/instrument-eta\.vercel\.app\/tool\/axial"/);
  assert.match(tags, /property="og:site_name" content="Instrument"/);
  assert.match(tags, /property="og:type" content="website"/);
  assert.match(tags, /name="twitter:title" content="Axial response · Instrument"/);
  assert.match(tags, /name="twitter:description"/);
});

test("no canonical means no og:url, rather than a wrong one", () => {
  const tags = ogHeadTags({
    host: "instrument-eta.vercel.app",
    site: { host: "instrument-eta.vercel.app" },
    documentTitle: "T",
    cwd: "/nonexistent",
  }).join("");
  assert.doesNotMatch(tags, /og:url/);
});

test("every share meta this emits is one the strip list owns", () => {
  // The two lists have to agree. A tag emitted here but absent from
  // SHARE_META_KEYS survives a second injection and the page ends up with two
  // of it; a key in the list but never emitted is the state og:image was in.
  const tags = ogHeadTags({
    host: "instrument-eta.vercel.app",
    site: { host: "instrument-eta.vercel.app", card: "custom", image: "/og.jpg" },
    documentTitle: "T",
    documentDescription: "D",
    documentCanonical: "https://instrument-eta.vercel.app/",
    cwd: "/nonexistent",
  });
  const emitted = tags.map((tag) => tag.match(/(?:property|name)="([^"]+)"/)?.[1]).filter(Boolean);
  assert.ok(emitted.length >= 9, `only emitted ${emitted.length}: ${emitted.join(", ")}`);
  const stripped = stripShareMetaTags(tags.join(""));
  assert.equal(stripped.trim(), "", `these survived the strip: ${stripped}`);
});
