/**
 * Should a `/review?id=…` link restore now, wait, or say the snapshot is gone?
 *
 * Three states rather than two, and the third is the one that was missing. An
 * empty desk means "not here" only once the desk has finished arriving. Signed
 * out that is true on the first render, because localStorage rehydrates
 * synchronously. Signed in it is not: the account view is blanked on mount and
 * refilled when the server answers, so for the first few hundred milliseconds
 * every saved review is absent. Reading the list once, at mount, therefore
 * reported a link to your own snapshot as deleted — and having already decided,
 * never looked again when the records landed.
 *
 * Pulled out of the component because that timing is not reachable from a test
 * that drives the page: it needs a signed-in session and a server round trip to
 * lose a race with. As a function it is four cases.
 */
export type RestoreDecision = "idle" | "wait" | "restore" | "missing";

export function decideReviewRestore({
  requestedId,
  restoredId,
  hasRecord,
  hydrating,
}: {
  /** The `id` search param, if any. */
  requestedId: string | undefined;
  /** The id already restored in this session, so it happens exactly once. */
  restoredId: string | null;
  /** Whether that id is present in the desk right now. */
  hasRecord: boolean;
  /** Whether the desk is still being fetched. */
  hydrating: boolean;
}): RestoreDecision {
  if (!requestedId) return "idle";
  // Restoring writes over eleven fields, so a second pass would discard
  // whatever was typed since the first one.
  if (restoredId === requestedId) return "idle";
  if (hasRecord) return "restore";
  return hydrating ? "wait" : "missing";
}
