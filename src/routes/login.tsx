import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ErrorState } from "@/components/ui/status";

export const Route = createFileRoute("/login")({   head: () => ({
    meta: [
      { title: "Sign in · Instrument" },
      { name: "description", content: "Sign in to keep favourites, projects and Build drafts on your account." },
      { property: "og:title", content: "Sign in · Instrument" },
      { property: "og:description", content: "Sign in to keep favourites, projects and Build drafts on your account." },
    ],
  }),
  component: Login });

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result =
        mode === "up"
          ? await authClient.signUp.email({ name: name.trim() || email.split("@")[0], email, password })
          : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message || "Could not sign in.");
        return;
      }
      await navigate({ to: "/" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-sm">
        <Link to="/" className="wordmark">
          Instrument
        </Link>
        <h1 className="page-title mt-8">{mode === "up" ? "Create an account" : "Sign in"}</h1>
        <p className="lede">
          Email and a password. No Google or X. Sign in and Favourites, Project, and Build drafts follow the account. Without an account they stay on this device.
        </p>
        {authEnabled ? (
          <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
            {mode === "up" ? (
              <Field htmlFor="account-name" label="Name">
                <Input
                  id="account-name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
            ) : null}
            <Field htmlFor="account-email" label="Email" required>
              <Input
                id="account-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field htmlFor="account-password" label="Password" required>
              <Input
                id="account-password"
                type="password"
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            {error ? <ErrorState>{error}</ErrorState> : null}
            <Button type="submit" variant="accent" disabled={busy} className="w-full">
              {busy ? "Working…" : mode === "up" ? "Create account" : "Sign in"}
            </Button>
          </form>
        ) : (
          <p className="mt-8 text-sm text-muted">Sign-in is disabled.</p>
        )}
        <Button
          type="button"
          variant="ghost"
          className="link-accent mt-4 px-0"
          onClick={() => {
            setError(null);
            setMode((current) => (current === "up" ? "in" : "up"));
          }}
        >
          {mode === "up" ? "Already have an account? Sign in" : "Need an account? Create one"}
        </Button>
        <div>
          <Link to="/" className="link-quiet mt-8 inline-block text-sm">
            Back to the library
          </Link>
        </div>
      </div>
    </main>
  );
}
