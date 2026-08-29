import { createFileRoute } from "@tanstack/react-router";
import { StudioEditor } from "@/studio/components/studio-editor";
import { useWorkshop } from "@/studio/lib/workshop-store";
import { MissingPage, PageLoading } from "@/components/missing-page";

export const Route = createFileRoute("/studio/$id")({ component: StudioEdit });

function StudioEdit() {
  const { id } = Route.useParams();
  const hasHydrated = useWorkshop((state) => state.hasHydrated);
  const item = useWorkshop((state) => state.get(id));

  if (!hasHydrated && !item) {
    return <PageLoading kicker="Build" />;
  }

  if (!item) {
    return (
      <MissingPage kicker="Build" title="That draft is not here." to="/workshop" backLabel="Back to Project" />
    );
  }

  return <StudioEditor key={item.id} item={item} />;
}
