import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { tools } from "@/lib/catalog";
import { useDeskStore } from "@/lib/workspace-store";
import { useWorkshop } from "@/gauge/lib/workshop-store";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { panelClass } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <div className="page-wrap max-w-xl">
        <div className="h-8 w-40 animate-pulse rounded-md bg-elevated" />
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <ProfileBody name={user.displayName ?? ""} email={user.primaryEmail ?? ""} />;
}

function ProfileBody({ name, email }: { name: string; email: string }) {
  const favorites = useDeskStore((state) => state.favorites);
  const calculations = useDeskStore((state) => state.calculations);
  const reviews = useDeskStore((state) => state.reviews);
  const drafts = useWorkshop((state) => state.items);
  const favouriteTools = favorites
    .map((id) => tools.find((tool) => tool.id === id))
    .filter(Boolean);

  const [displayName, setDisplayName] = useState(name);
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);

  async function saveName(event: FormEvent) {
    event.preventDefault();
    setNameMessage(null);
    setSavingName(true);
    try {
      const { error } = await authClient.updateUser({ name: displayName.trim() });
      if (error) {
        setNameMessage(error.message || "Could not save name.");
        return;
      }
      await authClient.getSession();
      setNameMessage("Saved.");
    } catch (caught) {
      setNameMessage(caught instanceof Error ? caught.message : "Could not save name.");
    } finally {
      setSavingName(false);
    }
  }

  const initial = (displayName.trim() || email || "?").charAt(0).toUpperCase();

  return (
    <div className="page-wrap max-w-xl">
      <p className="eyebrow">Account</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Profile</h1>
      <p className="mt-3 max-w-lg text-sm leading-6 text-muted">
        This is your Instrument account. Favourites and Project still live on this device.
      </p>

      <section className={cn(panelClass, "mt-8 bg-surface p-5")}>
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-md border border-border bg-elevated text-lg font-medium">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{displayName || "Account"}</p>
            <p className="truncate text-sm text-muted">{email || "—"}</p>
          </div>
        </div>
        <form className="mt-5 grid gap-4" onSubmit={saveName}>
          <Field htmlFor="profile-name" label="Name">
            <Input id="profile-name" autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </Field>
          <Field htmlFor="profile-email" label="Email">
            <Input id="profile-email" value={email} readOnly />
          </Field>
          {nameMessage ? <p className="text-sm text-muted">{nameMessage}</p> : null}
          <Button type="submit" disabled={savingName || !displayName.trim()}>
            {savingName ? "Saving…" : "Save name"}
          </Button>
        </form>
      </section>

      <section className={cn(panelClass, "mt-4 bg-surface p-5")}>
        <p className="eyebrow">On this device</p>
        <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-muted">Favourites</dt>
            <dd className="mt-1 font-mono tabular-nums">{favouriteTools.length}</dd>
          </div>
          <div>
            <dt className="text-muted">Drafts</dt>
            <dd className="mt-1 font-mono tabular-nums">{drafts.length}</dd>
          </div>
          <div>
            <dt className="text-muted">Saved checks</dt>
            <dd className="mt-1 font-mono tabular-nums">{calculations.length + reviews.length}</dd>
          </div>
        </dl>
        {favouriteTools.length ? (
          <ul className="mt-4 grid gap-1">
            {favouriteTools.map((tool) => (
              <li key={tool!.id}>
                <Link to="/tool/$toolId" params={{ toolId: tool!.id }} className="block py-1.5 text-sm hover:text-accent">
                  {tool!.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">No favourites yet. Star a model in the library.</p>
        )}
        <Link to="/workshop" className="mt-3 inline-block text-sm text-accent hover:text-fg">
          Open Project
        </Link>
      </section>

      <p className="mt-6 text-sm text-muted">
        Password and sign out are in{" "}
        <Link to="/settings" className="text-accent hover:text-fg">
          Account settings
        </Link>
        .
      </p>
    </div>
  );
}
