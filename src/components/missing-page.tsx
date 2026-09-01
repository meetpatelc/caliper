import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { PARENT_NAME } from "@/lib/instrument";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { LoadingState } from "@/components/ui/status";

export function MissingPage({
  kicker,
  title,
  to,
  backLabel,
}: {
  kicker: string;
  title: string;
  to: "/" | "/workshop";
  backLabel: string;
}) {
  return (
    <div className="page-wrap max-w-xl">
      <PageHeader size="display" kicker={kicker} title={title} />
      <Button asChild variant="ghost" className="mt-4">
        <Link to={to}>{backLabel}</Link>
      </Button>
    </div>
  );
}

/**
 * The router's `defaultNotFoundComponent`. Without one, an unmatched URL
 * renders TanStack Router's built-in `<p>Not Found</p>` — no shell, no way
 * back — and the server logs a warning on every miss.
 */
export function NotFoundPage() {
  // The tab said only "Instrument", so a dead link was indistinguishable from
  // the homepage in history and in a row of tabs. Set here rather than in a
  // route `head` because this renders from the router's not-found fallback,
  // which has no route of its own to hang metadata on.
  useEffect(() => {
    const previous = document.title;
    document.title = `Page not found · ${PARENT_NAME}`;
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <MissingPage
      kicker="Not here"
      title="That page is not on this desk."
      to="/"
      backLabel="Back to library"
    />
  );
}

export function PageLoading({ kicker }: { kicker: string }) {
  return (
    <div className="page-wrap">
      <p className="eyebrow">{kicker}</p>
      <LoadingState variant="block" className="mt-8" />
    </div>
  );
}
