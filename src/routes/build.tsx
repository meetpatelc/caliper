import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * `/build` answers, because the navigation says Build.
 *
 * The room was renamed from Studio to Build everywhere a person reads — the
 * header, the page kicker, the empty states — and the route kept its original
 * name, so the one address anybody would guess from the menu returned "not
 * here". Nothing linked to it, which is exactly why nothing caught it: the
 * broken address is the one a person types rather than clicks.
 *
 * A redirect rather than a second component. Two routes rendering the same page
 * is two canonical URLs, two entries for a crawler, and two places for a future
 * edit to land; `/studio` stays the address and `/build` is the door.
 */
export const Route = createFileRoute("/build")({
  beforeLoad: () => {
    throw redirect({ to: "/studio" });
  },
});
