import assert from "node:assert/strict";
import test from "node:test";
import { activeProvider, draftingEnabled } from "@/lib/ai/provider.server";

/**
 * Which account gets billed is not a detail to leave to precedence.
 *
 * Every one of these is about money or about a model nobody chose. A
 * deployment that names a provider and forgets its key must not quietly answer
 * from the other one, and an unconfigured deployment must not offer the
 * feature at all — the button is hidden on this answer, and a button that
 * appears and then fails is worse than one that was never there.
 */

/**
 * @param {Record<string, string | undefined>} vars
 * @param {() => void} run
 */
function withEnv(vars, run) {
  /** @type {Record<string, string | undefined>} */
  const saved = {};
  for (const [key, value] of Object.entries(vars)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const NONE = { AI_PROVIDER: undefined, OPENAI_API_KEY: undefined, ANTHROPIC_API_KEY: undefined };

test("no key means no drafting", () => {
  withEnv(NONE, () => {
    assert.equal(activeProvider(), null);
    assert.equal(draftingEnabled(), false);
  });
});

test("a single key selects itself", () => {
  withEnv({ ...NONE, OPENAI_API_KEY: "sk-test" }, () => {
    assert.equal(activeProvider(), "openai");
    assert.equal(draftingEnabled(), true);
  });
  withEnv({ ...NONE, ANTHROPIC_API_KEY: "sk-test" }, () => {
    assert.equal(activeProvider(), "anthropic");
    assert.equal(draftingEnabled(), true);
  });
});

test("an explicit provider wins over a key that is merely present", () => {
  withEnv({ ...NONE, AI_PROVIDER: "anthropic", OPENAI_API_KEY: "sk-test", ANTHROPIC_API_KEY: "sk-test" }, () => {
    assert.equal(activeProvider(), "anthropic");
  });
});

test("named but keyless is unconfigured, never a fallback to the other account", () => {
  withEnv({ ...NONE, AI_PROVIDER: "anthropic", OPENAI_API_KEY: "sk-test" }, () => {
    assert.equal(activeProvider(), "anthropic");
    assert.equal(draftingEnabled(), false, "falling back here would bill an account nobody chose");
  });
});

test("an unrecognised provider name disables drafting rather than guessing", () => {
  withEnv({ ...NONE, AI_PROVIDER: "gemini", OPENAI_API_KEY: "sk-test" }, () => {
    assert.equal(activeProvider(), null);
    assert.equal(draftingEnabled(), false);
  });
});

test("whitespace is not a key", () => {
  withEnv({ ...NONE, OPENAI_API_KEY: "   " }, () => {
    assert.equal(activeProvider(), null);
    assert.equal(draftingEnabled(), false);
  });
});
