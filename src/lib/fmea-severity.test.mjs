import assert from "node:assert/strict";
import test from "node:test";
import { calculateFmea } from "@/lib/reviewRules";

// The case that motivates the whole notice: ranked by RPN alone, a cosmetic
// scuff outranks a brake line rupture five to one.
test("a high-severity, low-RPN failure is not left to speak through its RPN", () => {
  const scuff = calculateFmea({ severity: 2, occurrence: 5, detection: 5 });
  const rupture = calculateFmea({ severity: 10, occurrence: 1, detection: 1 });

  assert.equal(scuff.rpn, 50);
  assert.equal(rupture.rpn, 10);
  assert.ok(scuff.rpn > rupture.rpn, "RPN really does rank the scuff higher");

  assert.equal(scuff.severityNotice, undefined);
  assert.match(String(rupture.severityNotice), /severity cannot be offset/i);
  assert.match(String(rupture.severityNotice), /RPN 10 does not retire it/i);
});

test("severity 7-8 with a low product is flagged, with a high product left alone", () => {
  const quiet = calculateFmea({ severity: 7, occurrence: 2, detection: 3 });
  assert.match(String(quiet.severityNotice), /neither of which reduces how bad/i);

  const loud = calculateFmea({ severity: 7, occurrence: 8, detection: 5 });
  assert.equal(loud.rpn, 280);
  assert.equal(loud.severityNotice, undefined, "RPN is already saying it");
});

test("ordinary ratings say nothing extra", () => {
  const ordinary = calculateFmea({ severity: 6, occurrence: 4, detection: 5 });
  assert.equal(ordinary.rpn, 120);
  assert.equal(ordinary.severityNotice, undefined);
});

test("the rating guard still holds", () => {
  assert.throws(() => calculateFmea({ severity: 0, occurrence: 4, detection: 5 }), /integer from 1 to 10/);
  assert.throws(() => calculateFmea({ severity: 5.5, occurrence: 4, detection: 5 }), /integer from 1 to 10/);
});
