import assert from "node:assert/strict";
import test from "node:test";
import { DOCUMENT_TOOL_IDS } from "./document-tool-ids.ts";
import { libraryDocuments } from "./document-library.ts";

test("the id list still matches the documents that exist", () => {
  /*
   * This is the safety net for the whole per-domain split.
   *
   * `computeTool` asks DOCUMENT_TOOL_IDS before anything else, and 33 of these
   * ids also have a hand-written implementation further down the same
   * if-chain — dead code today, because the document branch is first. So an id
   * missing from this list does not raise: the chain falls through and that
   * model quietly runs a different implementation, returning a different
   * number on a page that looks completely normal.
   *
   * Adding a model therefore has to fail here rather than there. Regenerate
   * with the snippet in document-tool-ids.ts if this goes red.
   */
  const actual = new Set(Object.keys(libraryDocuments));
  const missing = [...actual].filter((id) => !DOCUMENT_TOOL_IDS.has(id));
  const extra = [...DOCUMENT_TOOL_IDS].filter((id) => !actual.has(id));
  assert.deepEqual(missing, [], `documents with no entry in DOCUMENT_TOOL_IDS: ${missing.join(", ")}`);
  assert.deepEqual(extra, [], `DOCUMENT_TOOL_IDS names documents that do not exist: ${extra.join(", ")}`);
});

test("every id in the list can actually be loaded", () => {
  // A name in the list whose document lives in no domain module would pass the
  // check above and still throw at runtime, because loading is by domain.
  for (const id of DOCUMENT_TOOL_IDS) {
    assert.ok(libraryDocuments[id], `${id} is listed but has no document`);
  }
});
