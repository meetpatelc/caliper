import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Copy, FilePlus, PenLine } from "lucide-react";
import { useWorkshop } from "@/studio/lib/workshop-store";
import { useDeskStatus } from "@/lib/desk-mode";
import { studioDocuments } from "@/lib/document";
import { Button, buttonVariants, panelClass } from "@instrument/ui";
import { LoadingState } from "@/components/ui/status";
import { SelectableCard } from "@/components/ui/selection";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/")({ component: StudioHome });

function StudioHome() {
  const navigate = useNavigate();
  const createBlank = useWorkshop((state) => state.createBlank);
  const createStarter = useWorkshop((state) => state.createStarter);
  const createFrom = useWorkshop((state) => state.createFrom);
  const items = useWorkshop((state) => state.items).slice(0, 6);
  const { hydrating } = useDeskStatus();

  const open = (item: { id: string }) => {
    navigate({ to: "/studio/$id", params: { id: item.id } });
  };

  return (
    <div className="page-wrap">
      <p className="eyebrow">Studio</p>
      <h1 className="display-title mt-3">Name the quantities. Write the relation. Watch it compute.</h1>
      <p className="mt-5 max-w-xl text-base leading-7 text-muted">
        Start blank, start from a working example, or fork a formula instrument. Method is for publishing — not for the
        first number.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant="accent"
          className="h-auto min-h-28 flex-col items-start justify-between px-5 py-4 text-left"
          onClick={() => open(createBlank())}
        >
          <FilePlus size={18} />
          <span>
            <span className="block text-base font-medium">Create from scratch</span>
            <span className="mt-1 block text-sm text-accent-fg/80">Empty inputs. You name the quantities.</span>
          </span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className={cn(panelClass, "h-auto min-h-28 flex-col items-start justify-between px-5 py-4 text-left")}
          onClick={() => open(createStarter())}
        >
          <PenLine size={18} />
          <span>
            <span className="block text-base font-medium">Start from a working example</span>
            <span className="mt-1 block text-sm text-muted">Axial stress, already computing. Rename it.</span>
          </span>
        </Button>
      </div>
      <Link to="/workshop" className={cn(buttonVariants({ variant: "ghost" }), "mt-4")}>
        Project →
      </Link>

      {hydrating ? (
        <LoadingState className="mt-12">Loading the account desk.</LoadingState>
      ) : items.length > 0 ? (
        <section className="mt-12">
          <p className="eyebrow">Your drafts</p>
          <ul className="mt-4 grid gap-2">
            {items.map((item) => (
              <li key={item.id}>
                <SelectableCard asChild key={item.id}>
                  <Link
                    to="/studio/$id"
                    params={{ id: item.id }}
                    className="flex min-h-10 items-center justify-between px-3 py-3"
                  >
                  <span>{item.title}</span>
                    <span className="font-mono text-xs text-muted">{item.published ? "published" : "draft"}</span>
                  </Link>
                </SelectableCard>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-12">
        <p className="eyebrow">Start from a published model</p>
        <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Start from something you already trust.</h2>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {studioDocuments().map((item) => (
            <li key={item.slug}>
              <SelectableCard asChild key={item.slug}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-h-10 w-full justify-between gap-3 px-3 py-3 text-left"
                  onClick={() => open(createFrom(item))}
                >
                <span>
                  <span className="block text-sm font-medium">{item.title}</span>
                  <span className="font-mono text-xs text-muted">{item.formula}</span>
                </span>
                  <Copy size={14} className="shrink-0 text-accent" />
                </Button>
              </SelectableCard>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}