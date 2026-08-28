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
 *   OG identity is baked via `virtual:grok-og-identity` at `vite build`
 *   (this function cannot read `src/lib/og/site.json` or `public/og.jpg`).
 *   This must be a middleware transforming `next()`: h3 discards the `response`
 *   runtime hook's return value, and `render:html` does not exist in Nitro v3.
 */
import installPageTemplate from "../../scripts/install-page.html?raw";
import { grokOgIdentity } from "virtual:grok-og-identity";
import {
  acceptsHtml,
  createHeadInjector,
  isDocumentPath,
  isInstallQuery,
  renderInstallPageHtml,
  renderWebManifest,
} from "../../scripts/grok-pwa-shared.mjs";
import { buildPolicy, createNonce } from "../../scripts/csp-policy.mjs";
import { runWithNonce } from "../../scripts/csp-nonce.mjs";

interface GrokPwaEvent {
  url: URL;
  req: { method: string; headers: Headers };
}

function requestHost(event: GrokPwaEvent): string {
  return (
    event.req.headers.get("x-forwarded-host") ?? event.req.headers.get("host") ?? event.url.host
  );
}

function injectHeadStreaming(response: Response, host: string, nonce: string): Response {
  const injector = createHeadInjector({
    host,
    site: grokOgIdentity.site,
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

export default async function grokPwaMiddleware(
  event: GrokPwaEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const method = (event.req.method ?? "GET").toUpperCase();
  if (method !== "GET") return next();

  const path = event.url.pathname;
  const urlWithQuery = path + event.url.search;

  if (path === "/__pwa/manifest.webmanifest" || path === "/__pwa/manifest.json") {
    return new Response(renderWebManifest(requestHost(event)), {
      headers: {
        "content-type": "application/manifest+json; charset=utf-8",
        "cache-control": "no-cache",
      },
    });
  }

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
