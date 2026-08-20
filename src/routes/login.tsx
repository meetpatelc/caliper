import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { APP_NAME } from "@/lib/desk";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-semibold tracking-[0.16em]">
          {APP_NAME}
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-[-0.03em]">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Optional. Calculators and local project snapshots work without an account.
        </p>
        <div className="mt-6 grid gap-2">
          {authEnabled ? (
            GROK_PROVIDERS.map((provider) => (
              <button
                key={provider.providerId}
                type="button"
                onClick={() => signIn(provider.providerId, { callbackURL: "/" })}
                className="w-full rounded-md border border-border px-4 py-2.5 text-sm hover:bg-elevated"
              >
                Continue with {provider.label}
              </button>
            ))
          ) : (
            <p className="text-sm text-muted">Sign-in is disabled.</p>
          )}
        </div>
        <Link to="/" className="mt-6 inline-block text-sm text-accent">
          Back to the desk
        </Link>
      </div>
    </main>
  );
}
