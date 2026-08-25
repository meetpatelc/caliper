// @ts-nocheck
/**
 * `THEME_COLOR` is the one place a raw hex is allowed in `src/` — the
 * `<meta name="theme-color">` tag is emitted during SSR and cannot reference a
 * CSS custom property.
 *
 * That makes it a copy of `--color-bg`, so this pins it to the token file. If
 * the palette moves and this does not, the browser chrome ends up a different
 * colour from the page behind it — visible on mobile, and easy to miss.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { THEME_COLOR } from "./instrument.ts";

const TOKENS = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "packages/ui/src/tokens.css",
);

/**
 * Read `--color-bg` from a block of the token file. The light value lives in
 * the `@theme` block, the dark one in `html.dark`.
 *
 * Matched as "selector followed by an opening brace" rather than by plain
 * substring search: the file's header comment mentions `html.dark` in prose,
 * and matching that instead silently read the light block.
 */
function colorBg(css, blockSelector) {
  const opener = new RegExp(`${blockSelector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`);
  const found = opener.exec(css);
  assert.ok(found, `no ${blockSelector} block in tokens.css`);
  const open = found.index + found[0].length;
  const close = css.indexOf("}", open);
  const block = css.slice(open, close);
  const match = block.match(/--color-bg:\s*(#[0-9a-fA-F]{3,8})\s*;/);
  assert.ok(match, `no --color-bg in ${blockSelector}`);
  return match[1].toLowerCase();
}

test("theme-color matches --color-bg in both themes", () => {
  const css = readFileSync(TOKENS, "utf8");
  assert.equal(
    THEME_COLOR.light.toLowerCase(),
    colorBg(css, "@theme"),
    "THEME_COLOR.light drifted from --color-bg",
  );
  assert.equal(
    THEME_COLOR.dark.toLowerCase(),
    colorBg(css, "html.dark"),
    "THEME_COLOR.dark drifted from --color-bg",
  );
});

test("both themes are defined and distinct", () => {
  // A palette edit that collapsed the two would make the chrome wrong in one
  // theme without failing the comparison above.
  assert.match(THEME_COLOR.light, /^#[0-9a-fA-F]{6}$/);
  assert.match(THEME_COLOR.dark, /^#[0-9a-fA-F]{6}$/);
  assert.notEqual(THEME_COLOR.light.toLowerCase(), THEME_COLOR.dark.toLowerCase());
});
