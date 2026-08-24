import { Link } from "@tanstack/react-router";
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

export function PageLoading({ kicker }: { kicker: string }) {
  return (
    <div className="page-wrap">
      <p className="eyebrow">{kicker}</p>
      <LoadingState variant="block" className="mt-6" />
    </div>
  );
}
