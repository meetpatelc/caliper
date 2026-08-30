import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import {
  APP_ENV_REL_PATH,
  mergeAppEnv,
  parseAppEnv,
  projectRoot,
  readAppEnv,
} from "./with-app-env.mjs";

const execFileAsync = promisify(execFile);
const WRAPPER = join(projectRoot(), "scripts/with-app-env.mjs");
const PRINT_FLAG = "process.stdout.write(String(process.env.VITE_AUTH_ENABLED));";

/**
 * Symlink a directory, portably.
 *
 * A plain symlink needs elevation or Developer Mode on Windows, so these tests
 * used to skip there — which is how a real failure on Linux went unseen. A
 * junction is the same reparse point for our purposes (realpath resolves it)
 * and needs no privileges, so the test runs on every platform instead.
 */
function linkDir(target, path) {
  symlinkSync(target, path, process.platform === "win32" ? "junction" : undefined);
}

function makeWorkspace(appEnvJson) {
  const root = mkdtempSync(join(tmpdir(), "app-env-"));
  if (appEnvJson !== undefined) {
    // The override used to live inside a platform-named directory, which is why
    // this created one first. It is a file at the workspace root now, so the
    // fixture only has to write it.
    writeFileSync(join(root, APP_ENV_REL_PATH), appEnvJson);
  }
  return root;
}

test("keeps VITE_-prefixed string entries", () => {
  assert.deepEqual(parseAppEnv('{"VITE_AUTH_ENABLED":"false"}'), {
    VITE_AUTH_ENABLED: "false",
  });
});

test("drops non-VITE keys, non-string values and malformed documents", () => {
  assert.deepEqual(parseAppEnv('{"DATABASE_URL":"postgres://x","VITE_N":1,"VITE_OK":"y"}'), {
    VITE_OK: "y",
  });
  assert.deepEqual(parseAppEnv("not json"), {});
  assert.deepEqual(parseAppEnv('["VITE_AUTH_ENABLED"]'), {});
  assert.deepEqual(parseAppEnv("null"), {});
});

test("a missing app-env.json is a clean no-op", () => {
  assert.deepEqual(readAppEnv(makeWorkspace()), {});
});

test("reads the app env from a workspace", () => {
  const root = makeWorkspace('{"VITE_AUTH_ENABLED":"false"}');
  assert.deepEqual(readAppEnv(root), { VITE_AUTH_ENABLED: "false" });
});

test("an explicit process-env override wins over the file", () => {
  const merged = mergeAppEnv(
    { VITE_AUTH_ENABLED: "false" },
    { VITE_AUTH_ENABLED: "true", PATH: "/usr/bin" },
  );
  assert.equal(merged.VITE_AUTH_ENABLED, "true");
  assert.equal(merged.PATH, "/usr/bin");
});

test("a clone ships no app-env override (auth defaults on)", () => {
  // The override file is gitignored (workspace-only), so a fresh clone must resolve an
  // empty app env — VITE_AUTH_ENABLED unset means sign-in is on by default,
  // matching .env.example.
  assert.deepEqual(readAppEnv(projectRoot()), {});
});

test("vite loadEnv resolves the wrapped value", () => {
  // What `import.meta.env.VITE_AUTH_ENABLED` becomes: loadEnv prefix-matches
  // process.env, so the wrapper's merge has to land before Vite starts.
  // Do not `import { loadEnv } from "vite"` here — Vite 8 loads rolldown
  // native bindings that SIGSEGV the test worker under qemu-user.
  const root = makeWorkspace('{"VITE_AUTH_ENABLED":"false"}');
  const merged = mergeAppEnv(readAppEnv(root), { PATH: "/usr/bin" });
  assert.equal(merged.VITE_AUTH_ENABLED, "false");
});

test("the wrapped command runs with the app env applied", async () => {
  // Hermetic workspace: the wrapper resolves the app env relative to its own
  // location, so run a copy from a temp root that ships an app-env.json —
  // this repo's clone deliberately has none.
  const root = makeWorkspace('{"VITE_AUTH_ENABLED":"false"}');
  mkdirSync(join(root, "scripts"), { recursive: true });
  const wrapperCopy = join(root, "scripts", "with-app-env.mjs");
  copyFileSync(WRAPPER, wrapperCopy);
  const { stdout } = await execFileAsync(
    process.execPath,
    [wrapperCopy, process.execPath, "-e", PRINT_FLAG],
    { env: { ...process.env, VITE_AUTH_ENABLED: undefined } },
  );
  assert.equal(stdout, "false");
});

test("the wrapped command sees an explicit override, not the file value", async () => {
  const { stdout } = await execFileAsync(
    process.execPath,
    [WRAPPER, process.execPath, "-e", PRINT_FLAG],
    { env: { ...process.env, VITE_AUTH_ENABLED: "true" } },
  );
  assert.equal(stdout, "true");
});

test("the wrapper propagates the command's exit code", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [WRAPPER, process.execPath, "-e", "process.exit(3)"]),
    (err) => err.code === 3,
  );
});

test("a signal-killed command is never reported as success", async () => {
  // The wrapper's own SIGTERM handler must not swallow the re-raised signal:
  // a cancelled build reporting exit 0 is a silently passing gate.
  await assert.rejects(
    execFileAsync(process.execPath, [
      WRAPPER,
      process.execPath,
      "-e",
      "process.kill(process.pid, 'SIGTERM');setTimeout(() => {}, 1000);",
    ]),
    (err) => err.signal === "SIGTERM" || err.code !== 0,
  );
});

test("a bare npm-shim command name runs on every platform", async () => {
  // On Windows `npm` (like `vite`) is a .cmd batch shim: spawning it without a
  // shell fails with ENOENT, which broke `npm run dev/build/preview` there.
  const { stdout } = await execFileAsync(process.execPath, [WRAPPER, "npm", "--version"]);
  assert.match(stdout.trim(), /^\d+\.\d+\.\d+/);
});

test("the CLI still runs when invoked through a symlinked path", async () => {
  // node realpaths import.meta.url but not process.argv[1], so a raw comparison
  // turns the wrapper into a no-op that exits 0 without starting anything.
  //
  // Hermetic, like the other app-env tests: the wrapper resolves its app env
  // relative to its own REAL location, so symlink to a temp workspace that
  // ships one. Pointing at this repo's own scripts/ asserted a value that comes
  // from `.app-env.json` — gitignored, so absent in a fresh clone and in CI,
  // where the wrapper correctly printed "undefined".
  const root = makeWorkspace('{"VITE_AUTH_ENABLED":"false"}');
  mkdirSync(join(root, "scripts"), { recursive: true });
  copyFileSync(WRAPPER, join(root, "scripts", "with-app-env.mjs"));

  const link = join(mkdtempSync(join(tmpdir(), "app-env-link-")), "scripts");
  linkDir(join(root, "scripts"), link);

  const { stdout } = await execFileAsync(
    process.execPath,
    [join(link, "with-app-env.mjs"), process.execPath, "-e", PRINT_FLAG],
    { env: { ...process.env, VITE_AUTH_ENABLED: undefined } },
  );
  assert.equal(stdout, "false");
});
