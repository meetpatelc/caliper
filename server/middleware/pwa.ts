/**
 * Deployed-app (Nitro) half of the platform PWA chrome. Auto-registered as
 * global h3 middleware because vite.config.ts sets `serverDir: "./server"` —
 * without that option Nitro v3 never scans this directory.
 *
 * - `?install=1&platform=ios` on a document path → the Home Screen tutorial,
 *   bundled into the server build via `?raw` (the public/ directory is CDN
 *   static output on Vercel and not readable from the function).
 * - `/__pwa/manifest.webmanifest` → per-app-named manifest (kept out of
 *   public/ so this dynamic response is the only one).
 * - Other HTML documents → stream-inject PWA + OG head tags at `</head>`.
 *   OG identity is baked via `virtual:og-identity` at `vite build`
 *   (this function cannot read `src/lib/og/site.json` or `public/og.jpg`).
 *   This must be a middleware transforming `next()`: h3 discards the `response`
 *   runtime hook's return value, and `render:html` does not exist in Nitro v3.
 */
import installPageTemplate from "../../scripts/install-page.html?raw";
import { ogIdentity } from "virtual:og-identity";
import {
  acceptsHtml,
  createHeadInjector,
  isDocumentPath,
  isInstallQuery,
  renderInstallPageHtml,
  renderWebManifest,
} from "../../scripts/pwa-shared.mjs";
import { buildPolicy, createNonce } from "../../scripts/csp-policy.mjs";
import { runWithNonce } from "../../scripts/csp-nonce.mjs";

interface PwaEvent {
  url: URL;
  req: { method: string; headers: Headers };
}

function requestHost(event: PwaEvent): string {
  return (
    event.req.headers.get("x-forwarded-host") ?? event.req.headers.get("host") ?? event.url.host
  );
}

function injectHeadStreaming(response: Response, host: string, nonce: string): Response {
  const injector = createHeadInjector({
    host,
    site: ogIdentity.site,
  });
  const transformed = response.body!.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        for (const out of injector.push(chunk)) controller.enqueue(out);
      },
      flush(controller) {
        for (const out of injector.flush()) controller.enqueue(out);
      },
    }),
  );
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("Content-Security-Policy", buildPolicy({ nonce }));
  return new Response(transformed, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default async function pwaMiddleware(
  event: PwaEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  /*
   * HEAD reads, like GET.
   *
   * This gate was `method !== "GET"`, so a HEAD for the manifest fell through
   * to the router, which has no route by that name and answered 404 — for a
   * file that returns 200 to GET from the very next line. Link checkers,
   * uptime monitors and some crawlers ask with HEAD before they ask with GET,
   * and what they were told is that the manifest is not there.
   */
  const method = (event.req.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return next();

  const path = event.url.pathname;
  const urlWithQuery = path + event.url.search;

  if (path === "/__pwa/manifest.webmanifest" || path === "/__pwa/manifest.json") {
    const body = renderWebManifest(requestHost(event));
    return new Response(method === "HEAD" ? null : body, {
      headers: {
        "content-type": "application/manifest+json; charset=utf-8",
        "cache-control": "no-cache",
        // Same headers as the GET, which is what makes a HEAD worth asking.
        "content-length": String(new TextEncoder().encode(body).byteLength),
      },
    });
  }

  // Everything past here renders a document. The router answers HEAD for its
  // own routes, and rendering a whole page to throw the body away is work
  // nobody asked for.
  if (method === "HEAD") return next();

  if (
    isInstallQuery(urlWithQuery) &&
    isDocumentPath(path) &&
    acceptsHtml(event.req.headers.get("accept"))
  ) {
    // Served from here rather than through the router, so it never sees the
    // router's nonce — it gets its own, stamped onto its one inline script.
    const nonce = createNonce();
    const html = renderInstallPageHtml(installPageTemplate, {
      host: requestHost(event),
      url: urlWithQuery,
    }).replace("<script>", '<script nonce="' + nonce + '">');
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache",
        "Content-Security-Policy": buildPolicy({ nonce }),
      },
    });
  }

  if (!isDocumentPath(path)) return next();

  // The nonce has to exist before the render starts: getRouter() reads it out
  // of this store, and every inline script Start emits is stamped with
  // whatever it finds there. Generating it after next() would be too late.
  const nonce = createNonce();
  const result = await runWithNonce(nonce, () => next());
  if (
    result instanceof Response &&
    String(result.headers.get("content-type") ?? "").includes("text/html")
  ) {
    if (result.body && !result.headers.get("content-encoding")) {
      return injectHeadStreaming(result, requestHost(event), nonce);
    }
    // Compressed or bodyless, so not injectable — but it is still a document
    // and still needs the policy matching the nonce it was rendered with.
    const headers = new Headers(result.headers);
    headers.set("Content-Security-Policy", buildPolicy({ nonce }));
    return new Response(result.body, {
      status: result.status,
      statusText: result.statusText,
      headers,
    });
  }
  return result;
}
