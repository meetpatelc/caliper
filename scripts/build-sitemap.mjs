#!/usr/bin/env node
// @ts-check
/**
 * Generate public/sitemap.xml from the catalog.
 *
 * 169 model pages are the reason this app is worth finding — an engineer
 * searching "goodman fatigue" should land on the model, not the home page.
 * Without a sitemap a crawler has to discover them by following links from
 * the Library grid, which it may or may not do.
 *
 * Run after adding models: node scripts/build-sitemap.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ORIGIN = process.env.SITE_ORIGIN || "https://instrument-eta.vercel.app";
const STATIC = ["/", "/studio", "/review", "/workshop", "/about", "/reference", "/feedback"];

/** @param {string[]} toolIds */
export function renderSitemap(toolIds, origin = ORIGIN) {
  const today = new Date().toISOString().slice(0, 10);
  /** @param {string} path @param {string} priority */
  const url = (path, priority) =>
    `  <url>\n    <loc>${origin}${path}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${priority}</priority>\n  </url>`;
  const rows = [
    ...STATIC.map((p) => url(p, p === "/" ? "1.0" : "0.8")),
    ...toolIds.map((id) => url(`/tool/${id}`, "0.7")),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>\n`;
}

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { tools } = await import("../src/lib/catalog.ts");
const xml = renderSitemap(tools.map((t) => t.id));
writeFileSync(join(root, "public/sitemap.xml"), xml, "utf8");
console.log(`build-sitemap: ${STATIC.length + tools.length} urls -> public/sitemap.xml`);
