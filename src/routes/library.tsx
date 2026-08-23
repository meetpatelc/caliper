import { createFileRoute, redirect } from "@tanstack/react-router";

type LibrarySearch = { domain?: string; q?: string };

export const Route = createFileRoute("/library")({
  validateSearch: (search: Record<string, unknown>): LibrarySearch => ({
    domain: typeof search.domain === "string" ? search.domain : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/", search });
  },
});
