import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AccountMenu } from "@/components/account-menu";
import { CommandPalette } from "@/components/command-palette";
import { DeskSync } from "@/components/desk-sync";
import { FamilySwitch } from "@/components/family-switch";
import { FavouriteRail } from "@/components/favourite-rail";
import { OverlayDialog } from "@/components/overlay-dialog";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { SearchTrigger } from "@/components/ui/search";
import { LoadingState } from "@/components/ui/status";
import { PARENT_NAME, SEARCH_EVENT } from "@/lib/instrument";
import { ACCOUNT_NAV, PAGE_NAV, PRIMARY_NAV, SECONDARY_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    const onOpen = () => setPaletteOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(SEARCH_EVENT, onOpen);
    };
  }, []);

  const shortcut = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform) ? "⌘K" : "Ctrl K";

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
      >
        Skip to content
      </a>
      <header className="no-print sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-2 px-3 md:hidden">
          <FamilySwitch />
          <SearchTrigger
            ref={searchTriggerRef}
            onClick={() => setPaletteOpen(true)}
            aria-label="Search"
            className="min-w-0 flex-1"
          >
            <Search size={15} className="shrink-0" />
            <span className="truncate">Search</span>
          </SearchTrigger>
          <Button
            ref={menuTriggerRef}
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={18} />
          </Button>
        </div>
        <div className="relative hidden h-14 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:px-5">
          <div className="justify-self-start">
            <FamilySwitch />
          </div>
          <div className="flex items-center justify-center gap-2">
            <nav className="flex items-center gap-1" aria-label="Primary">
              {PRIMARY_NAV.map((item) => {
                const Icon = item.icon;
                const active = item.match(pathname);
                return (
                  <Button key={item.href} asChild variant="ghost">
                    <Link
                      to={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(active && "bg-elevated text-fg")}
                    >
                      <Icon size={15} />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
            </nav>
            <SearchTrigger
              ref={searchTriggerRef}
              onClick={() => setPaletteOpen(true)}
              aria-label="Search"
              shortcut={shortcut}
              className="w-[min(28rem,32vw)]"
            >
              <Search size={15} className="shrink-0" />
              <span className="flex-1 truncate text-left">Search…</span>
            </SearchTrigger>
            <ThemeToggle />
            <AccountMenu />
          </div>
          <div />
        </div>
      </header>

      <OverlayDialog
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Instrument"
        restoreFocusTo={menuTriggerRef}
        variant="drawer"
      >
        <div className="mb-6 flex items-center justify-between">
          <FamilySwitch />
          <Button variant="outline" size="icon" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            <X size={16} />
          </Button>
        </div>
        <nav className="grid gap-1">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <Button key={item.href} asChild variant="ghost">
                <Link
                  to={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn("w-full justify-start", active && "bg-elevated text-fg")}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              </Button>
            );
          })}
          {SECONDARY_NAV.map((item) => (
            <Button key={item.href} asChild variant="ghost">
              <Link to={item.href} onClick={() => setMenuOpen(false)} className="w-full justify-start text-muted">
                {item.label}
              </Link>
            </Button>
          ))}
          <DrawerAccount onClose={() => setMenuOpen(false)} />
        </nav>
        <div className="mt-auto grid gap-3 border-t border-border pt-4">
          <ThemeToggle appearance="labeled" />
        </div>
      </OverlayDialog>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} restoreFocusTo={searchTriggerRef} />
      <DeskSync />
      <main id="main-content">{children}</main>
      <FavouriteRail />
      <footer className="no-print border-t border-border py-6 text-sm text-muted">
        <div className="page-frame flex flex-wrap items-center justify-between gap-3">
          <p>{PARENT_NAME} · not a design stamp</p>
          <div className="flex flex-wrap gap-4">
            {PAGE_NAV.map((item) => (
              <Link key={item.href} to={item.href} className="link-quiet">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

function DrawerAccount({ onClose }: { onClose: () => void }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <LoadingState variant="bar" className="h-11 w-auto" />;
  if (!user) {
    return (
      <Button asChild variant="ghost">
        <Link to="/login" onClick={onClose} className="w-full justify-start">
          Sign in
        </Link>
      </Button>
    );
  }
  return (
    <>
      {ACCOUNT_NAV.map((item) => (
        <Button key={item.href} asChild variant="ghost">
          <Link to={item.href} onClick={onClose} className="w-full justify-start">
            {item.label}
          </Link>
        </Button>
      ))}
      <SignOutButton className="w-full justify-start" onClick={onClose} />
    </>
  );
}
