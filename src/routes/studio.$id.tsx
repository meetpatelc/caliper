import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { PARENT_NAME } from "@/lib/instrument";
import { StudioEditor } from "@/studio/components/studio-editor";
import { useWorkshop } from "@/studio/lib/workshop-store";
import { MissingPage, PageLoading } from "@/components/missing-page";

/**
 * The tab said only "Instrument", so every open draft looked the same in the
 * tab strip and in history. The draft name is the one thing that tells them
 * apart, and it is already in the URL params.
 */
export const Route = createFileRoute("/studio/$id")({
  head: () => ({ meta: [{ title: `Build · ${PARENT_NAME}` }] }),
  component: StudioEdit,
});

function StudioEdit() {
  const { id } = Route.useParams();
  const hasHydrated = useWorkshop((state) => state.hasHydrated);
  const item = useWorkshop((state) => state.get(id));
  useDocumentTitle(item?.title);

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

/**
 * The draft's own name in the tab.
 *
 * The route `head` cannot do this: the draft lives in the browser, so at route
 * definition time there is nothing to name it after. Every open draft therefore
 * shared one title and the tab strip was a row of identical entries — worst
 * exactly when somebody has several open, which is when Build is being used
 * properly.
 */
function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · ${PARENT_NAME}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
