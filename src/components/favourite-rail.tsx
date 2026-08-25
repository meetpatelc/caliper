import { Link } from "@tanstack/react-router";
import { tools } from "@/lib/catalog";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useDeskStatus } from "@/lib/desk-mode";
import { useDeskStore } from "@/lib/workspace-store";
import { panelClass } from "@/components/ui/panel";
import { EmptyState, LoadingState } from "@/components/ui/status";
import { cn } from "@/lib/utils";

/** Sits in the viewport gutter, outside the 1180px page wrap. Hidden when the gutter is too narrow. */
export function FavouriteRail() {
  const favorites = useDeskStore((state) => state.favorites);
  const { hydrating } = useDeskStatus();
  const { isPending } = useCurrentUserState();
  const loading = hydrating || isPending;
  const favouriteTools = favorites
    .map((id) => tools.find((tool) => tool.id === id))
    .filter(Boolean);

  return (
    <aside
      className="pointer-events-none fixed top-20 bottom-4 z-20 hidden min-[1440px]:block"
      style={{
        left: "calc(50% + min(36.875rem, 50vw - 1rem) + 0.75rem)",
        right: "0.75rem",
      }}
      aria-label="Favourite models"
      aria-busy={loading || undefined}
    >
      <div className={cn(panelClass, "pointer-events-auto max-h-full overflow-auto p-4")}>
        <p className="eyebrow">Favourite</p>
        {loading ? (
          <LoadingState className="mt-2">{hydrating ? "Loading the account desk." : "Loading."}</LoadingState>
        ) : favouriteTools.length ? (
          <ul className="mt-2 grid gap-1">
            {favouriteTools.map((tool) => (
              <li key={tool!.id}>
                <Link
                  to="/tool/$toolId"
                  params={{ toolId: tool!.id }}
                  className="link-accent block py-1.5 text-sm"
                >
                  {tool!.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState className="mt-2 leading-6">Favourite a model. It stays here.</EmptyState>
        )}
      </div>
    </aside>
  );
}
