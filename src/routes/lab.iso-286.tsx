import { createFileRoute } from "@tanstack/react-router";
import { Iso286WorkingInstrument } from "@/studio/components/iso-286-working";
import { PARENT_NAME } from "@/lib/instrument";

/**
 * A comparison page, not a product page.
 *
 * `/tool/fits` is untouched and remains the shipped ISO 286 calculator. This
 * route renders a second view of the same computation with the arithmetic
 * shown, so the two can be read side by side and this one dropped if it is not
 * better. Deleting this file and `iso-286-working.tsx` removes it completely.
 *
 * `noindex`, and absent from the catalogue, the nav and the command palette:
 * it is reachable by URL for comparison and by nothing else. A second page for
 * the same calculation is exactly the kind of thing that should not turn up in
 * a search result next to the real one.
 */
export const Route = createFileRoute("/lab/iso-286")({
  head: () => ({
    meta: [
      { title: `ISO 286 with the working · ${PARENT_NAME}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Iso286WorkingInstrument,
});
