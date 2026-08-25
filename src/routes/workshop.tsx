import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ClipboardList, FolderPlus, PenLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkshop } from "@/studio/lib/workshop-store";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Field, Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page";
import { panelClass } from "@/components/ui/panel";
import { DataRow } from "@/components/ui/row";
import { EmptyState, LoadingState } from "@/components/ui/status";
import { getTool } from "@/lib/catalog";
import { savedHeadline } from "@/lib/desk";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useDeskStatus } from "@/lib/desk-mode";
import { useHydrated } from "@/lib/use-hydrated";
import { useDeskStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workshop")({ component: ProjectPage });

type PendingDelete = { kind: "model" | "check" | "review" | "folder"; id: string; title: string };

function ProjectPage() {
  const navigate = useNavigate();
  const items = useWorkshop((state) => state.items);
  const createBlank = useWorkshop((state) => state.createBlank);
  const removeModel = useWorkshop((state) => state.remove);
  const projects = useDeskStore((state) => state.projects);
  const calculations = useDeskStore((state) => state.calculations);
  const reviews = useDeskStore((state) => state.reviews);
  const createProject = useDeskStore((state) => state.createProject);
  const setActiveProject = useDeskStore((state) => state.setActiveProject);
  const deleteProject = useDeskStore((state) => state.deleteProject);
  const deleteCalculation = useDeskStore((state) => state.deleteCalculation);
  const deleteReview = useDeskStore((state) => state.deleteReview);
  const activeProjectId = useDeskStore((state) => state.activeProjectId);
  const [name, setName] = useState("");
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const { isPending } = useCurrentUserState();
  const { accountMode, hydrating, fallback } = useDeskStatus();
  const onAccount = accountMode;
  // The desk lives in localStorage and the session resolves client-side, so the
  // server cannot know what this page shows. Folding `!hydrated` into the
  // desk-loading state makes every guard below render the same thing on the
  // server and on the first client render — otherwise React discards the whole
  // server tree for this page (it did: "Loading." vs "On this device.", then
  // again on two empty states).
  const hydrated = useHydrated();
  const loadingDesk = !hydrated || hydrating || isPending;
  const deskTitle = onAccount
    ? "On this account."
    : fallback || !loadingDesk
      ? "On this device."
      : "Loading.";
  const projectId = activeProjectId ?? projects[0]?.id ?? null;
  const visible = calculations.filter((item) => (projectId ? item.projectId === projectId : true));
  const empty = items.length === 0 && calculations.length === 0 && reviews.length === 0;

  const confirmPending = () => {
    if (!pending) return;
    if (pending.kind === "model") {
      removeModel(pending.id);
      toast.success("Model removed.");
    } else if (pending.kind === "check") {
      deleteCalculation(pending.id);
      toast.success("Check removed.");
    } else if (pending.kind === "review") {
      deleteReview(pending.id);
      toast.success("Review snapshot removed.");
    } else {
      deleteProject(pending.id);
      toast.success(`${pending.title} removed.`);
    }
    setPending(null);
  };

  return (
    <div className="page-wrap">
      <PageHeader
        kicker="Project"
        title={deskTitle}
        lede={
          loadingDesk ? (
            <LoadingState>{hydrating ? "Loading the account desk." : "Loading."}</LoadingState>
          ) : (
            <>
              {onAccount
                ? "Drafts, saved checks, and reviews follow this account. Write in "
                : fallback
                  ? "The account desk could not be loaded. Write in "
                  : "Drafts, saved checks, and reviews stay on this device until you sign in. Write in "}
              <Link to="/studio" className="link-accent">
                Studio
              </Link>{" "}
              or open{" "}
              <Link to="/review" className="link-accent">
                Review
              </Link>
              .
            </>
          )
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/review">
                <ClipboardList size={16} />
                Start a review
              </Link>
            </Button>
            <Button
              variant="accent"
              onClick={() => {
                const item = createBlank();
                navigate({ to: "/studio/$id", params: { id: item.id } });
              }}
            >
              <PenLine size={16} />
              Create from scratch
            </Button>
          </>
        }
      />

      {loadingDesk ? null : empty ? (
        <EmptyState
          className={cn(panelClass, "mt-10 p-6")}
          action={
            <Link to="/" className="link-accent">
              Open library
            </Link>
          }
        >
          Nothing here yet. Open a model and save a check, write one in Studio, or start a review.
        </EmptyState>
      ) : null}

      <section className="mt-10">
        <h2 className="section-title">Your models</h2>
        {loadingDesk ? null : items.length === 0 ? (
          <EmptyState className="mt-3">{onAccount ? "No drafts on this account." : "No drafts on this device."}</EmptyState>
        ) : (
          <ul className="mt-4 grid gap-3">
            {items.map((item) => (
              <li key={item.id}>
                <DataRow
                  align="start"
                  eyebrow={item.published ? "Published" : "Draft"}
                  title={<h3 className="section-title-sm">{item.title}</h3>}
                  meta={<p className="font-mono text-xs text-muted">{item.slug}</p>}
                  actions={
                    <>
                      <Button asChild>
                        <Link to="/c/$slug" params={{ slug: item.slug }}>
                          Open
                        </Link>
                      </Button>
                      <Button asChild variant="accent">
                        <Link to="/studio/$id" params={{ id: item.id }}>
                          Edit
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-10 text-muted hover:text-danger"
                        aria-label={`Delete ${item.title}`}
                        onClick={() => setPending({ kind: "model", id: item.id, title: item.title })}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12" id="checks">
        <h2 className="section-title">Saved checks</h2>
        <p className="mt-2 text-sm text-muted">Optional folders. The red one is the folder in use, not a trial of the product.</p>
        <form
          className="mt-4 flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) {
              toast.error("Name the project first.");
              return;
            }
            createProject(name);
            setName("");
            toast.success("Project created.");
          }}
        >
          <div className="min-w-[220px] flex-1">
            <Field htmlFor="folder-name" label="Folder name">
              <Input
                id="folder-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
          </div>
          <Button type="submit" variant="accent" disabled={!name.trim()}>
            <FolderPlus size={16} /> Create
          </Button>
        </form>
        {projects.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {projects.map((project) => (
              <span key={project.id} className="inline-flex items-center">
                <Button
                  type="button"
                  variant={project.id === projectId ? "accent" : "outline"}
                  onClick={() => setActiveProject(project.id)}
                  className="rounded-r-none"
                >
                  {project.name}
                </Button>
                <Button
                  type="button"
                  variant={project.id === projectId ? "accent" : "outline"}
                  className="rounded-l-none border-l-0 px-2"
                  aria-label={`Delete ${project.name}`}
                  onClick={() => setPending({ kind: "folder", id: project.id, title: project.name })}
                >
                  <Trash2 size={13} />
                </Button>
              </span>
            ))}
          </div>
        )}
        {loadingDesk ? null : visible.length === 0 ? (
          <EmptyState className="mt-4">No snapshots yet. Open a model and press Save.</EmptyState>
        ) : (
          <ul className="mt-4 grid gap-2">
            {visible.map((record) => {
              const tool = getTool(record.toolId);
              const headline = savedHeadline(record.resultJson);
              return (
                <li key={record.id}>
                  <DataRow
                    title={
                      <Link
                        to="/tool/$toolId"
                        params={{ toolId: record.toolId }}
                        search={{ ...record.input, restore: "1" }}
                        className="link-row"
                      >
                        {record.title}
                      </Link>
                    }
                    meta={
                      <p className="meta">
                        {tool?.title}
                        {headline ? ` · ${headline}` : ""} · {new Date(record.savedAt).toLocaleString()}
                      </p>
                    }
                    actions={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-10 text-muted hover:text-danger"
                        aria-label="Delete snapshot"
                        onClick={() => setPending({ kind: "check", id: record.id, title: record.title })}
                      >
                        <Trash2 size={15} />
                      </Button>
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {reviews.length > 0 && (
        <section className="mt-12">
          <h2 className="section-title">Review snapshots</h2>
          <ul className="mt-4 grid gap-2">
            {reviews.map((record) => (
              <li key={record.id}>
                <DataRow
                  title={
                    <Link to="/review" search={{ id: record.id }} className="link-row">
                      {record.title}
                    </Link>
                  }
                  meta={
                    <p className="meta">
                      {record.area} · {new Date(record.savedAt).toLocaleString()}
                    </p>
                  }
                  actions={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-10 text-muted hover:text-danger"
                      aria-label="Delete review"
                      onClick={() => setPending({ kind: "review", id: record.id, title: record.title })}
                    >
                      <Trash2 size={15} />
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title={
          pending?.kind === "folder"
            ? "Delete folder"
            : pending?.kind === "model"
              ? "Delete draft"
              : pending?.kind === "review"
                ? "Delete review snapshot"
                : "Delete saved check"
        }
        confirmLabel="Delete"
        onConfirm={confirmPending}
      >
        {pending?.kind === "folder"
          ? `Remove ${pending.title}? Checks inside stay.`
          : pending
            ? `Remove ${pending.title}? This cannot be undone.`
            : null}
      </ConfirmDialog>
    </div>
  );
}
