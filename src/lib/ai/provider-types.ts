/**
 * What a drafting provider may fail with.
 *
 * Shared by both implementations so the caller never has to know which one
 * ran. The kinds are chosen for what the person in front of the screen should
 * do next, not for what went wrong technically: `refused` and `malformed` mean
 * rewrite the brief, `upstream` means try again, `unavailable` means nothing
 * the user does will help.
 */
export type DraftFailure = {
  kind: "unavailable" | "refused" | "malformed" | "upstream";
  detail: string;
};

export type DraftResult = { ok: true; value: unknown } | { ok: false; failure: DraftFailure };

/** The providers this deployment knows how to talk to. */
export type ProviderId = "openai" | "anthropic";
