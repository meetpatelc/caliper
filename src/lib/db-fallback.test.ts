import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FALLBACK_DATA_LOSS_WARNING,
  fallbackDataLossWarning,
  isDeployedRuntime,
} from "./db-fallback.ts";

describe("isDeployedRuntime", () => {
  it("recognizes a hosting platform's own marker", () => {
    assert.equal(isDeployedRuntime({ VERCEL: "1" }), true);
  });

  it("a local run is not a deployment", () => {
    assert.equal(isDeployedRuntime({}), false);
  });

  it("`vite preview` is not a deployment", () => {
    // The preview server runs the production bundle locally, so NODE_ENV says
    // "production" for a process that is nobody's deployment.
    assert.equal(isDeployedRuntime({ NODE_ENV: "production" }), false);
  });

  it("an empty marker means unset", () => {
    // Same trap as an empty DATABASE_URL: a deploy UI can hand over a blank.
    assert.equal(isDeployedRuntime({ VERCEL: "  " }), false);
  });
});

describe("fallbackDataLossWarning", () => {
  it("warns when a deployed instance is on the fallback", () => {
    const warning = fallbackDataLossWarning({ VERCEL: "1" });
    assert.equal(warning, FALLBACK_DATA_LOSS_WARNING);
    assert.match(String(warning), /DATABASE_URL/);
  });

  it("stays quiet locally, where losing the data on restart is the deal", () => {
    assert.equal(fallbackDataLossWarning({}), null);
  });
});
