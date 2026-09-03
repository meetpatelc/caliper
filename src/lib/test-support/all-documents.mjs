import { loadAllDomains } from "@/lib/document-registry";

/**
 * Load every library document, for tests.
 *
 * In a browser, documents arrive one domain at a time and a route loader
 * fetches the one it needs before rendering. Node has no chunks and no network,
 * and a fixture suite legitimately wants all 159 at once, so it says so here
 * rather than each file inventing its own arrangement.
 *
 * Top-level await, so a plain side-effect import is enough:
 *
 *   import "@/lib/test-support/all-documents.mjs";
 *
 * A file that calculates without this fails with the model's own name and the
 * words "Its domain has not been loaded" — which is the whole reason membership
 * in DOCUMENT_TOOL_IDS is static and separate from what has been fetched. Were
 * they the same check, a missing import would not raise: 33 of these ids also
 * have a hand-written implementation further down the dispatch chain, and the
 * suite would quietly grade a different one.
 */
await loadAllDomains();
