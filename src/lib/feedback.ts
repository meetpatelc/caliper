import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMiddleware } from "@/lib/auth/middleware";
import { ATTACHMENT_MAX_BYTES, decodeBase64, inspectAttachment } from "@/lib/attachment";

/**
 * The cap the server enforces, exported so the form can state it.
 *
 * Someone asked, in the form itself, "Is there word limit?" — which means they
 * hit one or feared one, and nothing on the page answered. A limit the writer
 * cannot see is only discovered by losing work to it.
 */
export const FEEDBACK_MAX_CHARS = 20000;

const inputSchema = z.object({
  kind: z.enum(["bug", "message"]),
  message: z.string().trim().min(1).max(FEEDBACK_MAX_CHARS),
  pagePath: z.string().max(300),
  // Base64 so the bytes survive the JSON boundary. The ceiling is generous
  // against the 2 MB limit because base64 inflates by a third; the real check
  // is on the decoded bytes, where it belongs.
  attachment: z
    .object({
      name: z.string().max(200),
      data: z.string().max(Math.ceil(ATTACHMENT_MAX_BYTES * 1.4)),
    })
    .optional(),
});

export type FeedbackRow = {
  id: number;
  kind: "bug" | "message";
  message: string;
  pagePath: string | null;
  createdAt: string;
};

function asIso(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return new Date().toISOString();
}

/**
 * Per-sender throttle, in front of the global one.
 *
 * The only limit was global: 80 submissions an hour across everybody. One
 * person with a loop silences the feedback channel for every other user, and
 * the failure is invisible — legitimate senders just get "Try later" forever.
 * That is the same shape as the auth rate limiter that could not resolve a
 * client IP and put everyone in one bucket.
 *
 * Kept in memory rather than stored. Persisting a sender key means storing
 * something derived from an IP address against unauthenticated messages, which
 * is a privacy decision this does not need to take: a serverless instance
 * resets, but a burst from one source hits the same warm instance, which is
 * exactly the case being throttled. The global cap stays underneath as the
 * backstop it always was.
 */
const SENDER_WINDOW_MS = 60 * 60 * 1000;
const SENDER_PER_HOUR = 12;
const senderHits = new Map<string, number[]>();

function withinSenderRate(key: string) {
  const now = Date.now();
  const hits = (senderHits.get(key) ?? []).filter((at) => now - at < SENDER_WINDOW_MS);
  if (hits.length >= SENDER_PER_HOUR) {
    senderHits.set(key, hits);
    return false;
  }
  hits.push(now);
  senderHits.set(key, hits);
  // Unbounded growth is its own denial of service. Drop the coldest keys well
  // before the map could become the problem it is meant to prevent.
  if (senderHits.size > 5000) {
    for (const [k, v] of senderHits) {
      if (!v.some((at) => now - at < SENDER_WINDOW_MS)) senderHits.delete(k);
    }
  }
  return true;
}

export const submitFeedback = createServerFn({ method: "POST" })
  .validator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
    const { getSql } = await import("@/lib/db");
    assertSameSiteRequest();

    // Vercel sets these at its own edge; locally there is no proxy and every
    // sender collapses to one key, which is correct for one machine.
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const sender =
      getRequestHeader("x-vercel-forwarded-for") ??
      getRequestHeader("x-real-ip") ??
      getRequestHeader("x-forwarded-for") ??
      "local";
    if (!withinSenderRate(sender)) throw new Error("That is a lot of messages. Try again later.");

    const sql = await getSql();
    const recent = await sql<{ n: number }>`
      select count(*)::int as n from feedback where created_at > now() - interval '1 hour'
    `;
    if ((recent[0]?.n ?? 0) > 80) throw new Error("Too many messages. Try later.");

    let bytes: Uint8Array | null = null;
    let type: string | null = null;
    if (data.attachment) {
      const decoded = decodeBase64(data.attachment.data);
      if (!decoded) throw new Error("That attachment could not be read.");
      // Checked here and not only in the browser: this endpoint is
      // unauthenticated, so the client is a suggestion, not a gate.
      const check = inspectAttachment(decoded);
      if (!check.ok) throw new Error(check.reason);
      bytes = decoded;
      type = check.type;
    }

    await sql`
      insert into feedback (kind, message, page_path, attachment_bytes, attachment_type, attachment_name)
      values (
        ${data.kind}, ${data.message}, ${data.pagePath},
        ${bytes ? Buffer.from(bytes) : null}, ${type}, ${data.attachment?.name ?? null}
      )
    `;
    return { ok: true as const };
  });

/**
 * Everyone's messages in one list — shared data, so this is admin-only
 * (`ADMIN_EMAILS`). Submissions are anonymous and free-text, so any signed-in
 * visitor reading them would be a disclosure, not a feature.
 */
export const listFeedback = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async (): Promise<FeedbackRow[]> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      kind: string;
      message: string;
      page_path: string | null;
      created_at: unknown;
    }>`
      select id, kind, message, page_path, created_at
      from feedback
      order by created_at desc
      limit 50
    `;
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind === "message" ? "message" : "bug",
      message: row.message,
      pagePath: row.page_path,
      createdAt: asIso(row.created_at),
    }));
  });
