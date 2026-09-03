#!/usr/bin/env node
/**
 * Point git at the committed hooks directory.
 *
 * Runs from `prepare`, so `npm install` in a fresh clone wires the pre-push
 * gate up without anyone having to know it exists. Hooks in `.git/hooks` are
 * not committed and not shared, which is why `.githooks/` plus `core.hooksPath`
 * is the only arrangement that survives a clone.
 *
 * Quiet and non-fatal by design. This runs inside `npm ci` on the CI runner and
 * inside any tarball install, where there may be no `.git` at all -- and a
 * `prepare` script that can fail is a `prepare` script that breaks installs for
 * a convenience nobody asked for at that moment.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

// `.git` is a directory in a normal clone and a file in a worktree or submodule.
if (!existsSync(join(projectRoot, ".git"))) process.exit(0);

try {
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
    cwd: projectRoot,
    stdio: "ignore",
  });
  console.log("install-hooks: core.hooksPath -> .githooks");
} catch {
  // No git on PATH, or a config we are not allowed to write. Neither is worth
  // failing an install over; the hook is a safety net, not a dependency.
}
