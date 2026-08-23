import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ClipboardList, FolderPlus, PenLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkshop } from "@/gauge/lib/workshop-store";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { panelClass } from "@/components/ui/panel";
import { getTool } from "@/lib/catalog";
import { savedHeadline } from "@/lib/desk";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useDeskStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workshop")({ component: ProjectPage });

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
  const { user } = useCurrentUserState();
  const signedIn = Boolean(user);
  const projectId = activeProjectId ?? projects[0]?.id ?? null;
  const visible = calculations.filter((item) => (projectId ? item.projectId === projectId : true));
  const empty = items.length === 0 && calculations.length === 0 && reviews.length === 0;

  return (
    <div className="page-wrap">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Project</p>
          <h1 className="display-title mt-3">{signedIn ? "On this account." : "On this device."}</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted">
            {signedIn
              ? "Drafts, saved checks, and reviews follow this account. Write in "
              : "Drafts, saved checks, and reviews stay on this device until you sign in. Write in "}
            <Link to="/studio" className="text-accent hover:text-fg">
              Studio
            </Link>{" "}
            or open{" "}
            <Link to="/review" className="text-accent hover:text-fg">
              Review
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/review" className={buttonVariants({ variant: "outline" })}>
            <ClipboardList size={16} />
            Start a review
          </Link>
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
        </div>
      </div>

      {empty ? (
        <p className={cn(panelClass, "mt-10 p-6 text-sm text-muted")}>
          Nothing here yet. Open a model and save a check, write one in Studio, or start a review.
        </p>
      ) : null}

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Your models</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{signedIn ? "No drafts on this account." : "No drafts on this device."}</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {items.map((item) => (
              <li key={item.id} className={cn(panelClass, "p-4")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">{item.published ? "Published" : "Draft"}</p>
                    <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
                    <p className="mt-1 font-mono text-xs text-muted">{item.slug}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to="/c/$slug" params={{ slug: item.slug }} className={buttonVariants()}>
                      Open
                    </Link>
                    <Link to="/studio/$id" params={{ id: item.id }} className={buttonVariants({ variant: "accent" })}>
                      Edit
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-10 text-muted hover:text-danger"
                      aria-label={`Delete ${item.title}`}
                      onClick={() => {
                        removeModel(item.id);
                        toast.success("Model removed.");
                      }}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12" id="checks">
        <h2 className="text-xl font-semibold">Saved checks</h2>
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
                  onClick={() => {
                    deleteProject(project.id);
                    toast.success(`${project.name} removed.`);
                  }}
                >
                  <Trash2 size={13} />
                </Button>
              </span>
            ))}
          </div>
        )}
        {visible.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No snapshots yet. Open a model and press Save.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {visible.map((record) => {
              const tool = getTool(record.toolId);
              const headline = savedHeadline(record.resultJson);
              return (
                <li key={record.id} className={cn(panelClass, "flex flex-wrap items-center justify-between gap-3 px-4 py-3")}>
                  <div>
                    <Link
                      to="/tool/$toolId"
                      params={{ toolId: record.toolId }}
                      search={{ ...record.input, restore: "1" }}
                      className="font-medium hover:text-accent"
                    >
                      {record.title}
                    </Link>
                    <p className="font-mono text-[11px] text-muted">
                      {tool?.title}
                      {headline ? ` · ${headline}` : ""} · {new Date(record.savedAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 text-muted hover:text-danger"
                    aria-label="Delete snapshot"
                    onClick={() => deleteCalculation(record.id)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {reviews.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Review snapshots</h2>
          <ul className="mt-4 grid gap-2">
            {reviews.map((record) => (
              <li key={record.id} className={cn(panelClass, "flex items-center justify-between px-4 py-3")}>
                <div>
                  <Link to="/review" search={{ id: record.id }} className="font-medium hover:text-accent">
                    {record.title}
                  </Link>
                  <p className="font-mono text-[11px] text-muted">
                    {record.area} · {new Date(record.savedAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 text-muted hover:text-danger"
                  aria-label="Delete review"
                  onClick={() => deleteReview(record.id)}
                >
                  <Trash2 size={15} />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
