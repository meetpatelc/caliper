import assert from "node:assert/strict";
import { test } from "node:test";
import { patchSsr2Cycle, patchSsrExports } from "./patch-ssr-exports.mjs";

test("ssr.mjs s export becomes the server entry", () => {
  const src = `export { getServerFnById as a, __exportAll as c, createServerEntry, server_default as default, ssr_exports as s, server_exports as t };\n`;
  const next = patchSsrExports(src);
  assert.match(next, /server_default as s/);
  assert.doesNotMatch(next, /ssr_exports/);
  assert.equal(patchSsrExports(next), next);
});

test("drops a leftover empty ssr_exports binding", () => {
  const src = `var ssr_exports = {};\nexport { server_default as default, ssr_exports as s };\n`;
  const next = patchSsrExports(src);
  assert.match(next, /^export \{ server_default as default, server_default as s \};$/m);
  assert.doesNotMatch(next, /ssr_exports/);
});

test("ssr2.mjs loads __exportAll from runtime, not ssr.mjs", () => {
  const src = `import "../_runtime.mjs";\nimport { c as __exportAll$1 } from "./ssr.mjs";\nimport { AsyncLocalStorage } from "node:async_hooks";\n`;
  const next = patchSsr2Cycle(src);
  assert.match(next, /from "\.\.\/_runtime\.mjs"/);
  assert.doesNotMatch(next, /from "\.\/ssr\.mjs"/);
  assert.equal(patchSsr2Cycle(next), next);
});
