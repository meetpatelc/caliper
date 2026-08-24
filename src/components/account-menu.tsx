import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { panelClass } from "@/components/ui/panel";
import { LoadingState } from "@/components/ui/status";
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
    return <LoadingState variant="avatar" />;
  }
  if (!user) {
    return (
      <Button asChild variant="outline">
        <Link to="/login">Sign in</Link>
      </Button>
    );
  }

  const initial = initialFor(user.displayName, user.primaryEmail);

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account"
        onClick={() => setOpen((current) => !current)}
        className="overflow-hidden"
      >
        {user.profileImageUrl ? (
          <img src={user.profileImageUrl} alt="" className="size-full object-cover" />
        ) : (
          <span className="text-sm font-medium">{initial}</span>
        )}
      </Button>
      {open ? (
        <div role="menu" className={cn(panelClass, "absolute right-0 top-full z-40 mt-1 w-56 p-2")}>
          <p className="truncate px-2 pt-1 text-sm font-medium">{user.displayName || "Account"}</p>
          {user.primaryEmail ? <p className="truncate px-2 pb-2 text-xs text-muted">{user.primaryEmail}</p> : null}
          <Button asChild variant="ghost">
            <Link to="/profile" role="menuitem" className="w-full justify-start" onClick={() => setOpen(false)}>
              Profile
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/settings" role="menuitem" className="w-full justify-start" onClick={() => setOpen(false)}>
              Account settings
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
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
