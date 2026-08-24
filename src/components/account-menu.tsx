import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SignOutButton } from "@/components/sign-out-button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ACCOUNT_NAV } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem } from "@/components/ui/menu";
import { LoadingState } from "@/components/ui/status";

function initialFor(name: string | null, email: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  return source.charAt(0).toUpperCase();
}

export function AccountMenu() {
  const { user, isPending } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
    <div className="relative">
      <Button
        ref={triggerRef}
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
      <Menu open={open} onClose={() => setOpen(false)} label="Account" restoreFocusTo={triggerRef}>
        <p className="truncate px-2 pt-1 text-sm font-medium">{user.displayName || "Account"}</p>
        {user.primaryEmail ? <p className="truncate px-2 pb-2 text-xs text-muted">{user.primaryEmail}</p> : null}
        {ACCOUNT_NAV.map((item) => (
          <MenuItem key={item.href} asChild>
            <Link to={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          </MenuItem>
        ))}
        <SignOutButton asMenuItem onClick={() => setOpen(false)} />
      </Menu>
    </div>
  );
}
