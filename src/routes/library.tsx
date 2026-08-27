import { createFileRoute, redirect } from "@tanstack/react-router";

type LibrarySearch = { domain?: string };

/**
 * Legacy path. The library lives at `/`.
 *
 * This used to carry a `q` param through the redirect that `/` never reads —
 * a search term accepted, forwarded, and silently dropped. Text search happens
 * in the command palette, not on the library page, so the param is gone rather
 * than pretending. `domain` survives because `/` does honour it.
 */
export const Route = createFileRoute("/library")({
  validateSearch: (search: Record<string, unknown>): LibrarySearch => ({
    domain: typeof search.domain === "string" ? search.domain : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/", search });
  },
});
