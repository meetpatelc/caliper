#!/usr/bin/env node
/**
 * Serve the real production build, the way Vercel does.
 *
 * `npm run preview` does not do this. Vite's preview server hands back the dev
 * client entry (`/@id/virtual:tanstack-start-dev-client-entry`) and dev-mode
 * dependencies out of `node_modules/.vite/deps`, so a check run against it is
 * a check against development code. That difference is not academic: zod's
 * dev build calls `new Function`, which an enforced `script-src` blocks, and
 * the minified build does not call it at all. A CSP verified on the preview
 * server would have failed for a reason production does not have — and, worse,
 * the reverse is just as possible.
 *
 * This wraps `.vercel/output/functions/__server.func/index.mjs` — the actual
 * deployed artefact, which exports a web `fetch` handler — and serves
 * `.vercel/output/static` in front of it, which is what the platform's
 * filesystem handler does.
 *
 *   node scripts/serve-build.mjs [port]
 */
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { Readable } from "node:stream";

const PORT = Number(process.argv[2] || process.env.PORT || 8081);
const STATIC = ".vercel/output/static";
const FUNCTION = "../.vercel/output/functions/__server.func/index.mjs";

const TYPES = {
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".wasm": "application/wasm",
  ".data": "application/octet-stream",
};

if (!existsSync(".vercel/output")) {
  console.error("No build output. Run `npm run build` first.");
  process.exit(1);
}

const { default: handler } = await import(FUNCTION);

/** The platform answers from the filesystem before invoking the function. */
function staticFile(pathname) {
  const clean = normalize(decodeURIComponent(pathname));
  if (clean.includes("..")) return null;
  const candidate = join(STATIC, clean);
  if (!candidate.startsWith(normalize(STATIC))) return null;
  if (!existsSync(candidate)) return null;
  const stat = statSync(candidate);
  return stat.isFile() ? candidate : null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? `127.0.0.1:${PORT}`}`);

  const file = staticFile(url.pathname);
  if (file) {
    res.writeHead(200, {
      "content-type": TYPES[extname(file)] ?? "application/octet-stream",
      "cache-control": "public, max-age=0",
    });
    createReadStream(file).pipe(res);
    return;
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) for (const item of value) headers.append(key, item);
    else if (value !== undefined) headers.set(key, value);
  }

  const method = req.method ?? "GET";
  const body =
    method === "GET" || method === "HEAD" ? undefined : Readable.toWeb(req);

  let response;
  try {
    response = await handler.fetch(
      new Request(url.href, { method, headers, body, duplex: "half" }),
      { waitUntil: () => {} },
    );
  } catch (error) {
    console.error(`[serve-build] ${method} ${url.pathname}`, error);
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("function threw");
    return;
  }

  const out = {};
  response.headers.forEach((value, key) => {
    out[key] = value;
  });
  res.writeHead(response.status, out);
  if (!response.body) {
    res.end();
    return;
  }
  Readable.fromWeb(response.body).pipe(res);
});

server.listen(PORT, () => {
  console.log(`[serve-build] production build on http://127.0.0.1:${PORT}`);
});
