import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

export const submitFeedback = createServerFn({ method: "POST" })
  .validator((data: { kind: "bug" | "message"; message: string; pagePath: string }) => {
    const message = data.message.trim();
    if (!message) throw new Error("Add a message before submitting.");
    if (message.length > 20000) throw new Error("Message is limited to 20,000 characters.");
    if (data.kind !== "bug" && data.kind !== "message") throw new Error("Choose a message type.");
    return { kind: data.kind, message, pagePath: data.pagePath.slice(0, 300) };
  })
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`insert into feedback (kind, message, page_path) values (${data.kind}, ${data.message}, ${data.pagePath})`;
    return { ok: true as const };
  });
