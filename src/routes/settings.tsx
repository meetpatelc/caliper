import { createFileRoute, Link } from "@tanstack/react-router";
import { seoLinks, seoMeta } from "@/lib/seo";
import { useState, type FormEvent } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { authClient, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { wipeDesk } from "@/lib/desk-account";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState, SuccessState } from "@/components/ui/status";
import { Field, Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page";
import { panelClass } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({   head: () => ({
    meta: seoMeta({ title: "Account settings · Instrument", description: "Manage your account.", path: "/settings" }),
    links: seoLinks("/settings"),
  }),
  component: SettingsPage });

function SettingsPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <div className="page-wrap max-w-xl">
        <LoadingState variant="bar" />
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <SettingsBody email={user.primaryEmail ?? ""} />;
}

function SettingsBody({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordMessage(null);
    setSavingPassword(true);
    try {
      const { error } = await authClient.changePassword({ currentPassword, newPassword });
      if (error) {
        setPasswordMessage(error.message || "Could not change password.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setPasswordMessage("Password updated.");
    } catch (caught) {
      setPasswordMessage(caught instanceof Error ? caught.message : "Could not change password.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function removeAccount(event: FormEvent) {
    event.preventDefault();
    setDeleteMessage(null);
    setDeleting(true);
    try {
      await wipeDesk();
      const { error } = await authClient.deleteUser({ password: deletePassword });
      if (error) {
        setDeleteMessage(error.message || "Could not delete the account.");
        setDeleting(false);
        return;
      }
      await signOut("/");
    } catch (caught) {
      setDeleteMessage(caught instanceof Error ? caught.message : "Could not delete the account.");
      setDeleting(false);
    }
  }

  return (
    <div className="page-wrap max-w-xl">
      <PageHeader
        size="page"
        kicker="Account"
        title="Settings"
        lede={
          <>
            Password, appearance, and the account itself. Name and email live on{" "}
            <Link to="/profile" className="link-accent">
              Profile
            </Link>
            .
          </>
        }
      />

      <section className={cn(panelClass, "mt-8 p-5")}>
        <p className="eyebrow">Signed in as</p>
        <p className="mt-2 text-sm">{email || "—"}</p>
      </section>

      <section className={cn(panelClass, "mt-4 p-5")}>
        <p className="eyebrow">Appearance</p>
        <div className="mt-4">
          <ThemeToggle appearance="segmented" />
        </div>
      </section>

      <section className={cn(panelClass, "mt-4 p-5")}>
        <p className="eyebrow">Password</p>
        <form className="mt-4 grid gap-4" onSubmit={savePassword}>
          <Field htmlFor="settings-current" label="Current password">
            <Input
              id="settings-current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </Field>
          <Field htmlFor="settings-new" label="New password">
            <Input
              id="settings-new"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </Field>
          {passwordMessage === "Password updated." ? (
            <SuccessState>{passwordMessage}</SuccessState>
          ) : passwordMessage ? (
            <ErrorState>{passwordMessage}</ErrorState>
          ) : null}
          <Button type="submit" variant="accent" disabled={savingPassword || currentPassword.length < 1 || newPassword.length < 8}>
            {savingPassword ? "Updating…" : "Update password"}
          </Button>
        </form>
      </section>

      <section className={cn(panelClass, "mt-4 p-5")}>
        <p className="eyebrow">Session</p>
        <p className="mt-2 text-sm leading-6 text-muted">Sign out on this browser. Favourites and Project stay on the account.</p>
        <SignOutButton variant="outline" className="mt-4" />
      </section>

      <section className={cn(panelClass, "mt-4 p-5")}>
        <p className="eyebrow">Delete account</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Removes the email account and the Favourites, Project, and Build drafts on it. Work that never left this browser stays.
        </p>
        <form className="mt-4 grid gap-4" onSubmit={removeAccount}>
          <Field htmlFor="settings-delete" label="Password to confirm" error={deleteMessage || undefined}>
            <Input
              id="settings-delete"
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
            />
          </Field>
          <Button type="submit" variant="mark" disabled={deleting || deletePassword.length < 1}>
            {deleting ? "Deleting…" : "Delete account"}
          </Button>
        </form>
      </section>
    </div>
  );
}
