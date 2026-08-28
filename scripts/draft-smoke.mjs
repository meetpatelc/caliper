#!/usr/bin/env node
/**
 * One real drafting call, end to end, without the browser.
 *
 * The rest of the drafting path is covered by tests that never touch the
 * network — schema shape, provider selection, what `acceptDraft` refuses. What
 * no test here can cover is whether the provider accepts the schema we send it,
 * because that needs a key and a bill. This is the check for that, and it is
 * the one to run first after setting a key.
 *
 * Loads `.env.local` itself. Nothing else in this repo does: on the platform
 * these arrive as project environment variables, so nothing needed to.
 *
 *   npm run draft:smoke
 *   node --experimental-strip-types scripts/draft-smoke.mjs "your own brief"
 *
 * Prints the outcome and the worked example. Never writes anything and never
 * publishes anything — the draft is discarded when the process exits.
 */
import { readFileSync, existsSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    // A real environment variable always wins, so an override still works.
    if (process.env[key] !== undefined) continue;
    let value = rawValue.trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
    if (quoted) value = value.slice(1, -1);
    process.env[key] = value;
  }
}

register("./alias-register.mjs", pathToFileURL("./scripts/"));

const { activeProvider, draftCalculator } = await import("../src/lib/ai/provider.server.ts");
const { acceptDraft } = await import("../src/lib/ai/accept-draft.ts");

/**
 * Wrapped in a function so nothing calls `process.exit` while the SDK still has
 * sockets open — on Windows that aborts inside libuv and prints an assertion
 * failure after the real result, which reads like a second, worse problem.
 */
async function main() {
  const provider = activeProvider();
  if (!provider) {
    console.error("No provider configured.");
    console.error("Put OPENAI_API_KEY (or ANTHROPIC_API_KEY) in .env.local,");
    console.error("or set AI_PROVIDER to name one explicitly.");
    return 1;
  }

  // Masked deliberately. This prints in a terminal that may be shared or pasted.
  const key = provider === "openai" ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY;
  console.log(`provider: ${provider}`);
  console.log(`key: present, ${String(key).trim().length} characters`);

  const brief =
    process.argv[2] ||
    "Hoop stress in a thin-walled cylinder from internal pressure, inside diameter and wall thickness. Only valid while the wall stays thin.";
  console.log(`brief: ${brief.slice(0, 90)}${brief.length > 90 ? "…" : ""}`);
  console.log("");

  const started = Date.now();
  const result = await draftCalculator(brief);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  if (!result.ok) {
    console.error(`FAILED after ${seconds}s — ${result.failure.kind}: ${result.failure.detail}`);
    if (result.failure.kind === "upstream" || result.failure.kind === "unavailable") {
      console.error("If the provider rejected the schema, the offending keyword is logged above.");
    }
    return 1;
  }

  const outcome = acceptDraft(result.value);
  if (!outcome.ok) {
    console.error(`The model answered in ${seconds}s, but the draft was refused:`);
    console.error(`  ${outcome.reason}`);
    return 1;
  }

  console.log(`ACCEPTED in ${seconds}s`);
  console.log(`  title:       ${outcome.draft.title}`);
  console.log(`  provenance:  ${outcome.draft.provenance}`);
  console.log(`  inputs:      ${outcome.draft.fields.map((field) => field.id).join(", ")}`);
  console.log(`  constraints: ${outcome.draft.constraints?.length ?? 0}`);
  console.log("  worked example:");
  for (const item of outcome.preview) {
    console.log(`    ${item.label}: ${item.display} ${item.unit}`);
  }
  return 0;
}

process.exitCode = await main();
