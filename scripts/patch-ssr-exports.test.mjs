import assert from "node:assert/strict";
import { test } from "node:test";
import { patchSsr2Cycle, patchSsrExports } from "./patch-ssr-exports.mjs";

/**
 * What these guard is a build-output rewrite, so the useful assertions are
 * about the code it produces, not the string it matched.
 *
 * Two failures are on record. Rebinding the namespace export to the server
 * entry broke every consumer that reaches through it — Rolldown emits
 * `import("./ssr.mjs").then((n) => n.<ns>).then((n) => n.t)` for dynamic
 * imports of `@tanstack/react-start/server`, and `.t` on the entry is
 * undefined. That failed every feedback submission in production, and the same
 * shape sits in better-auth's cookie plugin, which writes the session cookie.
 * Separately, keying the rules on the single letters Rolldown happened to
 * assign meant one added import renumbered them and every route 500'd.
 *
 * The fixtures carry the import line because the rewrite checks that the names
 * it references are actually in scope, and that check is worth exercising.
 */
const IMPORTS = `import { c as server_default, l as server_exports } from "./ssr2.mjs";\n`;
const EXPORTS = `export { ssr_exports as c, server_default as default, server_exports as t };\n`;

test("the namespace is declared, whether or not the chunk declared it", () => {
  // The shape actually emitted: named in the export list, never declared.
  const bound = patchSsrExports(IMPORTS + EXPORTS);
  assert.match(bound, /var ssr_exports = /, "a declaration must be inserted");
  assert.match(bound, /ssr_exports as c/, "the export list must be left exactly as it was");

  // The other shape: declared, but as an empty object.
  const fromEmpty = patchSsrExports(`${IMPORTS}var ssr_exports = {};\n${EXPORTS}`);
  assert.doesNotMatch(fromEmpty, /var ssr_exports = \{\};/, "the empty object must not survive");
  assert.match(fromEmpty, /Object\.create\(server_default\)/);
});

test("the bound namespace serves both consumers", () => {
  // Execute what the rewrite produces, rather than trusting its shape.
  const server_default = {
    marker: "entry",
    fetch() {
      return this.marker;
    },
  };
  const server_exports = { setCookie: () => "cookie", getRequestHeader: () => "header" };
  const patched = patchSsrExports(IMPORTS + EXPORTS);
  const body = patched.split("\n").find((line) => line.startsWith("var ssr_exports"));
  const ssr_exports = new Function(
    "server_default",
    "server_exports",
    `${body}\nreturn ssr_exports;`,
  )(server_default, server_exports);

  // Nitro reaches for the entry through it.
  assert.equal(typeof ssr_exports.fetch, "function");
  assert.equal(ssr_exports.fetch(), "entry", "`this` must still resolve to the entry");
  // The two-hop dynamic imports reach for the module namespace through `.t`.
  assert.equal(typeof ssr_exports.t.setCookie, "function", "better-auth reaches setCookie this way");
  assert.equal(typeof ssr_exports.t.getRequestHeader, "function");
});

test("running it twice changes nothing", () => {
  const once = patchSsrExports(IMPORTS + EXPORTS);
  assert.equal(patchSsrExports(once), once);
});

test("a build that never names the namespace is left alone", () => {
  const src = `${IMPORTS}export { server_default as default, server_exports as t };\n`;
  assert.equal(patchSsrExports(src), src);
});

test("a chunk missing the names it would reference fails loudly", () => {
  // Better a failed build than an ssr.mjs that throws on first import.
  assert.throws(() => patchSsrExports(EXPORTS), /not in scope/);
});

test("the ssr2 cycle is cut whatever letter __exportAll landed on", () => {
  for (const letter of ["c", "l", "z9"]) {
    const src = `import "../_runtime.mjs";\nimport { ${letter} as __exportAll$1 } from "./ssr.mjs";\n`;
    const next = patchSsr2Cycle(src);
    assert.doesNotMatch(next, /from "\.\/ssr\.mjs"/, `letter ${letter} must be handled`);
    assert.match(next, /from "\.\.\/_runtime\.mjs"/);
    assert.equal(patchSsr2Cycle(next), next);
  }
});
