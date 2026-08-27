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

// Euler is elastic. Below the slenderness at which its critical stress reaches
// yield, it returns a load the column cannot reach — it squashes first — and
// the number looks exactly as trustworthy as a valid one.
test("stability stays quiet where buckling genuinely governs", () => {
  const r = calculateTool("stability", { endCondition: "1", length: "1.5", modulus: "200", inertia: "25", area: "12", yieldStrength: "250" });
  assert.equal(r.errors.length, 0, r.errors.join(" | "));
  // Euler 219 kN against a squash load of 250 MPa x 12 cm2 = 300 kN.
  assert.ok(!r.warnings.some((w) => /squash/i.test(w)), r.warnings.join(" | "));
});

test("stability warns when the column would yield before it buckles", () => {
  const r = calculateTool("stability", { endCondition: "1", length: "0.8", modulus: "200", inertia: "25", area: "12", yieldStrength: "250" });
  assert.equal(r.errors.length, 0, r.errors.join(" | "));
  // Same section, half the length: Euler climbs to 771 kN against the same
  // 300 kN squash load, so the reported load is unreachable.
  assert.ok(r.warnings.some((w) => /squash/i.test(w)), r.warnings.join(" | "));
  assert.ok(r.warnings.some((w) => /Johnson/i.test(w)), "the message must name the treatment to use instead");
});

test("stability reports the slenderness the catalog advertises", () => {
  const r = calculateTool("stability", { endCondition: "1", length: "1.5", modulus: "200", inertia: "25", area: "12", yieldStrength: "250" });
  const lambda = r.values.find((v) => v.key === "slenderness");
  assert.ok(lambda, "outputLabel promises 'Critical load · slenderness'");
  assert.equal(lambda.display, "103.92");
});
