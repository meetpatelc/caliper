import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMiddleware } from "@/lib/auth/middleware";

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

export const submitFeedback = createServerFn({ method: "POST" })
  .validator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
    const { getSql } = await import("@/lib/db");
    assertSameSiteRequest();
    const sql = await getSql();
    const recent = await sql<{ n: number }>`
      select count(*)::int as n from feedback where created_at > now() - interval '1 hour'
    `;
    if ((recent[0]?.n ?? 0) > 80) throw new Error("Too many messages. Try later.");
    await sql`
      insert into feedback (kind, message, page_path)
      values (${data.kind}, ${data.message}, ${data.pagePath})
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
