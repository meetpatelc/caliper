import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { tools } from "@/lib/catalog";

/**
 * A source with no URL must be named, never linked.
 *
 * Moving the library off competitor calculator pages replaced most citations
 * with a document and no URL — Roark, Shigley, NASA RP-1228, ISO 1101 — because
 * a precise title cannot rot the way a guessed link can. `instrument-page.tsx`
 * already rendered a link-less label as plain text, so that read correctly.
 *
 * `/reference` did not. It rendered every citation as `<a href={sourceUrl}>`,
 * so fifty-one of them became `<a href="">`: styled as links, and clicking one
 * reloads /reference. On the page whose entire job is letting somebody check a
 * source, that is worse than showing no link at all — it looks like the source
 * is one click away and it is not.
 *
 * Two more read the same field the same way, on the homepage's worked example
 * and on a calculation record.
 *
 * This asserts the shape rather than the output, because none of these render
 * without a browser: every place that puts `sourceUrl` in an `href` has to
 * guard it first.
 */
const RENDERS_A_SOURCE_LINK = [
  "src/routes/reference.tsx",
  "src/routes/index.tsx",
  "src/routes/record/$toolId.tsx",
  "src/components/instrument-page.tsx",
];

test("the library really does ship sources with no URL", () => {
  // If this ever fails the guards below are dead weight — but it also means
  // somebody put a URL back on every citation, which is worth noticing.
  const linkless = tools.filter((tool) => !tool.sourceUrl);
  assert.ok(
    linkless.length > 0,
    "no tool has an empty sourceUrl; the link guards may no longer be needed",
  );
});

test("no source URL reaches an href without being checked first", () => {
  const offenders = [];
  for (const path of RENDERS_A_SOURCE_LINK) {
    const source = readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
    for (const [index, line] of source.split(/\r?\n/).entries()) {
      // An href taking a source URL is fine; it just has to sit inside a
      // conditional. The guard is always on the line above or the same line.
      if (!/href=\{[^}]*(?:sourceUrl|source\.url)[^}]*\}/.test(line)) continue;
      const before = source.split(/\r?\n/).slice(Math.max(0, index - 3), index).join(" ");
      const guarded = /\?\s*\(|&&|sourceUrl\s*\?|source\.url\s*\?/.test(before + line);
      if (!guarded) offenders.push(`${path}:${index + 1} — ${line.trim().slice(0, 70)}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `these render a possibly-empty source as a link:\n  ${offenders.join("\n  ")}`,
  );
});
