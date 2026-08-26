import assert from "node:assert/strict";
import test from "node:test";
import { RECORD_VERSION_KEY, recordPath, splitRecordSearch } from "@/lib/search-params";

// The stamp is what makes a later correction visible on links already sent.
// It cannot be applied retroactively, so these guard that it is written at the
// moment the link is made and read back cleanly.
test("a record link carries the model version that produced it", () => {
  const path = recordPath("axial", { force: "20", area: "1000" }, ["force", "area"], "1.0.0");
  assert.ok(path.startsWith("/record/axial?"), path);
  const params = new URLSearchParams(path.split("?")[1]);
  assert.equal(params.get(RECORD_VERSION_KEY), "1.0.0");
  assert.equal(params.get("force"), "20");
});

test("the stamp is separated from the inputs, never computed as one", () => {
  const { input, stampedVersion } = splitRecordSearch({ force: "20", area: "1000", fv: "1.0.0" });
  assert.equal(stampedVersion, "1.0.0");
  assert.deepEqual(input, { force: "20", area: "1000" });
  assert.ok(!(RECORD_VERSION_KEY in input));
});

test("a link shared before stamping existed makes no claim either way", () => {
  const { input, stampedVersion } = splitRecordSearch({ force: "20" });
  assert.equal(stampedVersion, undefined);
  assert.deepEqual(input, { force: "20" });
});
