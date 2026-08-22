import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { FolderPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { panelClass } from "@/components/ui/panel";
import { getTool } from "@/lib/catalog";
import { useDeskStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects")({ component: ProjectsPage });

function ProjectsPage() {
  const projects = useDeskStore((state) => state.projects);
  const calculations = useDeskStore((state) => state.calculations);
  const reviews = useDeskStore((state) => state.reviews);
  const createProject = useDeskStore((state) => state.createProject);
  const setActiveProject = useDeskStore((state) => state.setActiveProject);
  const deleteCalculation = useDeskStore((state) => state.deleteCalculation);
  const deleteReview = useDeskStore((state) => state.deleteReview);
  const activeProjectId = useDeskStore((state) => state.activeProjectId);
  const [name, setName] = useState("");
  const projectId = activeProjectId ?? projects[0]?.id ?? null;
  const visible = calculations.filter((item) => (projectId ? item.projectId === projectId : true));

  return (
    <div className="page-wrap">
      <p className="eyebrow">Local records</p>
      <h1 className="display-title mt-3">Projects</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
        Snapshots live in this browser. Sign-in is optional and is not required to keep a calculation, review, or note.
      </p>

      <form
        className="mt-8 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          createProject(name);
          setName("");
          toast.success("Project created.");
        }}
      >
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="New project name" className="min-w-[220px]" />
        <Button type="submit" variant="accent">
          <FolderPlus size={16} /> Create
        </Button>
      </form>

      {projects.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {projects.map((project) => (
            <Button
              key={project.id}
              type="button"
              variant={project.id === projectId ? "accent" : "outline"}
              onClick={() => setActiveProject(project.id)}
              className="text-xs"
            >
              {project.name}
            </Button>
          ))}
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Saved calculations</h2>
        {visible.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No snapshots yet. Open a model and press Save.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {visible.map((record) => {
              const tool = getTool(record.toolId);
              return (
                <li key={record.id} className={cn(panelClass, "flex flex-wrap items-center justify-between gap-3 px-4 py-3")}>
                  <div>
                    <Link to="/tool/$toolId" params={{ toolId: record.toolId }} search={{ ...record.input, restore: "1" }} className="font-medium hover:text-accent">
                      {record.title}
                    </Link>
                    <p className="font-mono text-[11px] text-muted">{tool?.title} · {new Date(record.savedAt).toLocaleString()}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="size-9 text-muted hover:text-danger" aria-label="Delete snapshot" onClick={() => deleteCalculation(record.id)}>
                    <Trash2 size={15} />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Review snapshots</h2>
        {reviews.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No review records yet.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {reviews.map((record) => (
              <li key={record.id} className={cn(panelClass, "flex items-center justify-between px-4 py-3")}>
                <div>
                  <Link to="/review" search={{ id: record.id }} className="font-medium hover:text-accent">
                    {record.title}
                  </Link>
                  <p className="font-mono text-[11px] text-muted">{record.area} · {new Date(record.savedAt).toLocaleString()}</p>
                </div>
                <Button variant="ghost" size="icon" className="size-9 text-muted hover:text-danger" aria-label="Delete review" onClick={() => deleteReview(record.id)}>
                  <Trash2 size={15} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
