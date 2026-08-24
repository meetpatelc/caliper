import { useState } from "react";
import { signOut } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { MenuItem } from "@/components/ui/menu";

export function SignOutButton({
  asMenuItem = false,
  variant = "ghost",
  className,
  onClick,
}: {
  asMenuItem?: boolean;
  variant?: "ghost" | "outline";
  className?: string;
  onClick?: () => void;
}) {
  const [signingOut, setSigningOut] = useState(false);
  const label = signingOut ? "Signing out…" : "Sign out";
  const handleClick = () => {
    onClick?.();
    setSigningOut(true);
    void signOut("/").catch(() => setSigningOut(false));
  };
  if (asMenuItem) {
    return (
      <MenuItem className={className} disabled={signingOut} onClick={handleClick}>
        {label}
      </MenuItem>
    );
  }
  return (
    <Button type="button" variant={variant} className={className} disabled={signingOut} onClick={handleClick}>
      {label}
    </Button>
  );
}
