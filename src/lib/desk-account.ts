import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import type { WorkshopCalculator } from "@/studio/lib/calculator-types";
import type { DeskProject, ReviewSnapshot, SavedCalculation } from "@/lib/workspace-store";

export type DeskSnapshot = {
  favorites: string[];
  projects: DeskProject[];
  calculations: SavedCalculation[];
  reviews: ReviewSnapshot[];
  drafts: WorkshopCalculator[];
};

const MAX_DRAFT_JSON = 200_000;

const projectSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  createdAt: z.string().max(40),
});

const calculationSchema = z.object({
  id: z.string().min(1).max(80),
  projectId: z.string().min(1).max(80),
  toolId: z.string().min(1).max(80),
  title: z.string().max(120),
  input: z.record(z.string(), z.string()),
  method: z.string().max(400),
  resultJson: z.string().max(20_000),
  savedAt: z.string().max(40),
});

const reviewSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().max(120),
  area: z.string().max(40),
  payloadJson: z.string().max(50_000),
  savedAt: z.string().max(40),
});

const snapshotSchema = z.object({
  favorites: z.array(z.string().min(1).max(80)).max(200),
  projects: z.array(projectSchema).max(50),
  calculations: z.array(calculationSchema).max(200),
  reviews: z.array(reviewSchema).max(100),
  drafts: z.array(z.unknown()).max(50),
});

function asIso(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return new Date().toISOString();
}

function parseDraft(json: string): WorkshopCalculator | null {
  try {
    const value = JSON.parse(json) as WorkshopCalculator;
    if (!value || typeof value !== "object" || typeof value.id !== "string") return null;
    return { ...value, origin: "workshop" };
  } catch {
    return null;
  }
}

function draftJson(item: unknown): string {
  const json = JSON.stringify(item);
  if (json.length > MAX_DRAFT_JSON) throw new Error("Draft is too large.");
  return json;
}

async function sqlClient() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

async function readDesk(userId: string): Promise<DeskSnapshot> {
  const sql = await sqlClient();
  const favorites = await sql<{ tool_id: string }>`
    select tool_id from desk_favorites where user_id = ${userId} order by created_at desc
  `;
  const projects = await sql<{ id: string; name: string; created_at: unknown }>`
    select id, name, created_at from desk_projects where user_id = ${userId} order by created_at desc
  `;
  const calculations = await sql<{
    id: string;
    project_id: string;
    tool_id: string;
    title: string;
    input_json: string;
    method: string;
    result_json: string;
    saved_at: unknown;
  }>`
    select id, project_id, tool_id, title, input_json, method, result_json, saved_at
    from desk_calculations where user_id = ${userId} order by saved_at desc
  `;
  const reviews = await sql<{ id: string; title: string; area: string; payload_json: string; saved_at: unknown }>`
    select id, title, area, payload_json, saved_at from desk_reviews
    where user_id = ${userId} order by saved_at desc
  `;
  const drafts = await sql<{ document_json: string }>`
    select document_json from desk_drafts where user_id = ${userId} order by updated_at desc
  `;

  return {
    favorites: favorites.map((row) => row.tool_id),
    projects: projects.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: asIso(row.created_at),
    })),
    calculations: calculations.map((row) => {
      let input: Record<string, string> = {};
      try {
        input = JSON.parse(row.input_json) as Record<string, string>;
      } catch {
        input = {};
      }
      return {
        id: row.id,
        projectId: row.project_id,
        toolId: row.tool_id as SavedCalculation["toolId"],
        title: row.title,
        input,
        method: row.method,
        resultJson: row.result_json,
        savedAt: asIso(row.saved_at),
      };
    }),
    reviews: reviews.map((row) => ({
      id: row.id,
      title: row.title,
      area: row.area,
      payloadJson: row.payload_json,
      savedAt: asIso(row.saved_at),
    })),
    drafts: drafts.map((row) => parseDraft(row.document_json)).filter((item): item is WorkshopCalculator => Boolean(item)),
  };
}

function isEmptyDesk(desk: DeskSnapshot) {
  return (
    desk.favorites.length === 0 &&
    desk.projects.length === 0 &&
    desk.calculations.length === 0 &&
    desk.reviews.length === 0 &&
    desk.drafts.length === 0
  );
}

export const getDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => readDesk(context.userId));

export const claimDesk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => snapshotSchema.parse(data))
  .handler(async ({ context, data }) => {
    const existing = await readDesk(context.userId);
    if (!isEmptyDesk(existing)) return existing;

    const sql = await sqlClient();
    await sql`begin`;
    try {
      for (const toolId of data.favorites) {
        await sql`
          insert into desk_favorites (user_id, tool_id) values (${context.userId}, ${toolId})
          on conflict (user_id, tool_id) do nothing
        `;
      }
      for (const project of data.projects) {
        await sql`
          insert into desk_projects (id, user_id, name, created_at)
          values (${project.id}, ${context.userId}, ${project.name}, ${project.createdAt})
          on conflict (id) do nothing
        `;
      }
      for (const record of data.calculations) {
        await sql`
          insert into desk_calculations (id, user_id, project_id, tool_id, title, input_json, method, result_json, saved_at)
          values (
            ${record.id}, ${context.userId}, ${record.projectId}, ${record.toolId}, ${record.title},
            ${JSON.stringify(record.input)}, ${record.method}, ${record.resultJson}, ${record.savedAt}
          )
          on conflict (id) do nothing
        `;
      }
      for (const record of data.reviews) {
        await sql`
          insert into desk_reviews (id, user_id, title, area, payload_json, saved_at)
          values (${record.id}, ${context.userId}, ${record.title}, ${record.area}, ${record.payloadJson}, ${record.savedAt})
          on conflict (id) do nothing
        `;
      }
      for (const draft of data.drafts) {
        const item = draft as unknown as WorkshopCalculator;
        if (typeof item.id !== "string" || typeof item.slug !== "string") continue;
        const json = draftJson(item);
        await sql`
          insert into desk_drafts (id, user_id, slug, document_json, updated_at)
          values (${item.id}, ${context.userId}, ${item.slug}, ${json}, ${item.updatedAt ?? new Date().toISOString()})
          on conflict (id) do nothing
        `;
      }
      await sql`commit`;
    } catch (error) {
      await sql`rollback`;
      throw error;
    }
    return readDesk(context.userId);
  });

export const setFavoriteAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => z.object({ toolId: z.string().min(1).max(80), on: z.boolean() }).parse(data))
  .handler(async ({ context, data }) => {
    const sql = await sqlClient();
    if (data.on) {
      await sql`
        insert into desk_favorites (user_id, tool_id) values (${context.userId}, ${data.toolId})
        on conflict (user_id, tool_id) do nothing
      `;
      return { on: true as const };
    }
    await sql`delete from desk_favorites where user_id = ${context.userId} and tool_id = ${data.toolId}`;
    return { on: false as const };
  });

export const createProjectAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => projectSchema.parse(data))
  .handler(async ({ context, data }) => {
    const sql = await sqlClient();
    await sql`
      insert into desk_projects (id, user_id, name, created_at)
      values (${data.id}, ${context.userId}, ${data.name}, ${data.createdAt})
    `;
    return data;
  });

export const deleteProjectAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => z.string().min(1).max(80).parse(id))
  .handler(async ({ context, data: id }) => {
    const sql = await sqlClient();
    await sql`delete from desk_calculations where user_id = ${context.userId} and project_id = ${id}`;
    await sql`delete from desk_projects where user_id = ${context.userId} and id = ${id}`;
  });

export const saveCalculationAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => calculationSchema.parse(data))
  .handler(async ({ context, data }) => {
    const sql = await sqlClient();
    await sql`
      insert into desk_calculations (id, user_id, project_id, tool_id, title, input_json, method, result_json, saved_at)
      values (
        ${data.id}, ${context.userId}, ${data.projectId}, ${data.toolId}, ${data.title},
        ${JSON.stringify(data.input)}, ${data.method}, ${data.resultJson}, ${data.savedAt}
      )
    `;
    return data;
  });

export const deleteCalculationAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => z.string().min(1).max(80).parse(id))
  .handler(async ({ context, data: id }) => {
    const sql = await sqlClient();
    await sql`delete from desk_calculations where user_id = ${context.userId} and id = ${id}`;
  });

export const saveReviewAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => reviewSchema.parse(data))
  .handler(async ({ context, data }) => {
    const sql = await sqlClient();
    await sql`
      insert into desk_reviews (id, user_id, title, area, payload_json, saved_at)
      values (${data.id}, ${context.userId}, ${data.title}, ${data.area}, ${data.payloadJson}, ${data.savedAt})
    `;
    return data;
  });

export const deleteReviewAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => z.string().min(1).max(80).parse(id))
  .handler(async ({ context, data: id }) => {
    const sql = await sqlClient();
    await sql`delete from desk_reviews where user_id = ${context.userId} and id = ${id}`;
  });

export const upsertDraftAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((item: WorkshopCalculator) => {
    if (!item?.id || !item.slug) throw new Error("Draft is incomplete.");
    draftJson(item);
    return item;
  })
  .handler(async ({ context, data: item }) => {
    const sql = await sqlClient();
    const json = draftJson(item);
    const updatedAt = item.updatedAt || new Date().toISOString();
    const owned = await sql<{ id: string }>`
      select id from desk_drafts where id = ${item.id} and user_id = ${context.userId}
    `;
    if (owned.length) {
      await sql`
        update desk_drafts
        set slug = ${item.slug}, document_json = ${json}, updated_at = ${updatedAt}
        where id = ${item.id} and user_id = ${context.userId}
      `;
      return { id: item.id };
    }
    // Insert idempotently rather than check-then-insert.
    //
    // One publish fires several writes in the same second — the debounced
    // autosave, `persistNow`, and the state update that follows it — so two
    // calls can both find no row, both pass a "does this id exist" check, and
    // both insert. `on conflict` makes that harmless instead of a lost save.
    //
    // The id predicate keeps ownership intact: a row belonging to someone else
    // updates nothing rather than being overwritten, and the caller is told.
    const written = await sql<{ id: string }>`
      insert into desk_drafts (id, user_id, slug, document_json, updated_at)
      values (${item.id}, ${context.userId}, ${item.slug}, ${json}, ${updatedAt})
      on conflict (id) do update
        set slug = excluded.slug,
            document_json = excluded.document_json,
            updated_at = excluded.updated_at
        where desk_drafts.user_id = ${context.userId}
      returning id
    `;
    if (!written.length) throw new Error("Draft already exists.");
    return { id: item.id };
  });

export const deleteDraftAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => z.string().min(1).max(80).parse(id))
  .handler(async ({ context, data: id }) => {
    const sql = await sqlClient();
    await sql`delete from desk_drafts where user_id = ${context.userId} and id = ${id}`;
  });

export const wipeDesk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await sqlClient();
    await sql`delete from desk_favorites where user_id = ${context.userId}`;
    await sql`delete from desk_calculations where user_id = ${context.userId}`;
    await sql`delete from desk_reviews where user_id = ${context.userId}`;
    await sql`delete from desk_drafts where user_id = ${context.userId}`;
    await sql`delete from desk_projects where user_id = ${context.userId}`;
  });
