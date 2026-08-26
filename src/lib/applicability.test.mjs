import assert from "node:assert/strict";
import test from "node:test";
import { calculateTool } from "@/lib/engineering";

// D/t = 50: a genuinely thin wall, nothing to say.
test("thinVessel stays quiet inside its range", () => {
  const r = calculateTool("thinVessel", { pressure: "1.2", diameter: "600", thickness: "12" });
  assert.equal(r.errors.length, 0);
  assert.ok(!r.warnings.some((w) => /thin wall/i.test(w)), r.warnings.join(" | "));
});

// D/t = 5: still computes, and the number it returns reads low.
test("thinVessel warns when the wall is not thin", () => {
  const r = calculateTool("thinVessel", { pressure: "1.2", diameter: "600", thickness: "120" });
  assert.equal(r.errors.length, 0, r.errors.join(" | "));
  assert.ok(r.warnings.some((w) => /not a thin wall/i.test(w)), r.warnings.join(" | "));
  assert.ok(r.warnings.some((w) => /Lam/i.test(w)));
});
