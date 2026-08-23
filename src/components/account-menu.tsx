import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button, buttonVariants } from "@/components/ui/button";
import { panelClass } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

function initialFor(name: string | null, email: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  return source.charAt(0).toUpperCase();
}

export function AccountMenu() {
  const { user, isPending } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (isPending) {
    return <div className="size-10 shrink-0 animate-pulse rounded-md bg-elevated" aria-hidden="true" />;
  }
  if (!user) {
    return (
      <Link to="/login" className={cn(buttonVariants({ variant: "outline" }))}>
        Sign in
      </Link>
    );
  }

  const initial = initialFor(user.displayName, user.primaryEmail);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account"
        onClick={() => setOpen((current) => !current)}
        className={cn(buttonVariants({ variant: "outline", size: "icon" }), "overflow-hidden")}
      >
        {user.profileImageUrl ? (
          <img src={user.profileImageUrl} alt="" className="size-full object-cover" />
        ) : (
          <span className="text-sm font-medium">{initial}</span>
        )}
      </button>
      {open ? (
        <div role="menu" className={cn(panelClass, "absolute right-0 top-full z-40 mt-1 w-56 bg-surface p-2")}>
          <p className="truncate px-2 pt-1 text-sm font-medium">{user.displayName || "Account"}</p>
          {user.primaryEmail ? <p className="truncate px-2 pb-2 text-xs text-muted">{user.primaryEmail}</p> : null}
          <Link
            to="/profile"
            role="menuitem"
            className="block rounded-md px-2 py-2 text-sm hover:bg-elevated"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          <Link
            to="/settings"
            role="menuitem"
            className="block rounded-md px-2 py-2 text-sm hover:bg-elevated"
            onClick={() => setOpen(false)}
          >
            Account settings
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start px-2 text-sm"
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true);
              void signOut("/").catch(() => setSigningOut(false));
            }}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
