import { createFileRoute, Link } from "@tanstack/react-router";
import { StudioEditor } from "@/studio/components/studio-editor";
import { useWorkshop } from "@/studio/lib/workshop-store";
import { buttonVariants } from "@instrument/ui";
import { LoadingState } from "@/components/ui/status";

export const Route = createFileRoute("/studio/$id")({ component: StudioEdit });

function StudioEdit() {
  const { id } = Route.useParams();
  const hasHydrated = useWorkshop((state) => state.hasHydrated);
  const item = useWorkshop((state) => state.get(id));

  if (!hasHydrated && !item) {
    return (
      <div className="page-wrap">
        <p className="eyebrow">Studio</p>
        <LoadingState variant="block" className="mt-6" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="page-wrap max-w-xl">
        <p className="eyebrow">Studio</p>
        <h1 className="display-title mt-3">That draft is not here.</h1>
        <Link to="/workshop" className={buttonVariants({ variant: "ghost" })}>
          Back to Project
        </Link>
      </div>
    );
  }

  return <StudioEditor key={item.id} item={item} />;
}
