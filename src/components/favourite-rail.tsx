import { Link } from "@tanstack/react-router";
import { tools } from "@/lib/catalog";
import { useDeskStore } from "@/lib/workspace-store";
import { panelClass } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

/** Sits in the viewport gutter, outside the 1180px page wrap. Hidden when the gutter is too narrow. */
export function FavouriteRail() {
  const favorites = useDeskStore((state) => state.favorites);
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
    >
      <div className={cn(panelClass, "pointer-events-auto max-h-full overflow-auto p-4")}>
        <p className="eyebrow">Favourite</p>
        {favouriteTools.length ? (
          <ul className="mt-3 grid gap-1">
            {favouriteTools.map((tool) => (
              <li key={tool!.id}>
                <Link
                  to="/tool/$toolId"
                  params={{ toolId: tool!.id }}
                  className="block py-1.5 text-sm hover:text-accent"
                >
                  {tool!.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted">Favourite a model. It stays here.</p>
        )}
      </div>
    </aside>
  );
}
