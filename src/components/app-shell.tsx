import { Link, useRouterState } from "@tanstack/react-router";
import { ClipboardList, Folder, LayoutGrid, Menu, Moon, PenLine, Search, Sun, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CommandPalette } from "@/components/command-palette";
import { FamilySwitch } from "@/components/family-switch";
import { OverlayDialog } from "@/components/overlay-dialog";
import { FavouriteRail } from "@/components/favourite-rail";
import { AccountMenu } from "@/components/account-menu";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button, buttonVariants } from "@/components/ui/button";
import { PARENT_NAME, THEME_KEY } from "@/lib/instrument";
import { cn } from "@/lib/utils";

const primaryNav = [
  {
    href: "/",
    label: "Library",
    icon: LayoutGrid,
    match: (path: string) => path === "/" || path.startsWith("/library") || path.startsWith("/tool/"),
  },
  { href: "/studio", label: "Studio", icon: PenLine, match: (path: string) => path.startsWith("/studio") },
  { href: "/review", label: "Review", icon: ClipboardList, match: (path: string) => path.startsWith("/review") },
  {
    href: "/workshop",
    label: "Project",
    icon: Folder,
    match: (path: string) => path.startsWith("/workshop") || path.startsWith("/projects"),
  },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
    setTheme(stored);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    const onOpen = () => setPaletteOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("caliper:open-search", onOpen);
    window.addEventListener("gauge:open-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("caliper:open-search", onOpen);
      window.removeEventListener("gauge:open-search", onOpen);
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.classList.toggle("light", next !== "dark");
  };

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
          <button
            ref={searchTriggerRef}
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Search models"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "min-h-10 min-w-0 flex-1 justify-start gap-2 bg-surface font-normal text-muted hover:border-accent hover:text-fg",
            )}
          >
            <Search size={15} className="shrink-0" />
            <span className="truncate">Search</span>
          </button>
          <button
            ref={menuTriggerRef}
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "shrink-0")}
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={18} />
          </button>
        </div>
        <div className="relative hidden h-14 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:px-5">
          <div className="justify-self-start">
            <FamilySwitch />
          </div>
          <div className="flex items-center justify-center gap-2">
            <nav className="flex items-center gap-1" aria-label="Primary">
              {primaryNav.map((item) => {
                const Icon = item.icon;
                const active = item.match(pathname);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(buttonVariants({ variant: "ghost" }), active && "bg-elevated text-fg")}
                  >
                    <Icon size={15} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <button
              ref={searchTriggerRef}
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search models"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "min-h-10 w-[min(28rem,32vw)] justify-start gap-2 bg-surface font-normal text-muted hover:border-accent hover:text-fg",
              )}
            >
              <Search size={15} className="shrink-0" />
              <span className="flex-1 truncate text-left">Search models…</span>
              <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">{shortcut}</kbd>
            </button>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
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
          <Button variant="outline" size="icon" className="size-9" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            <X size={16} />
          </Button>
        </div>
        <nav className="grid gap-1">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-md px-3 py-3 text-sm hover:bg-elevated",
                  active && "bg-elevated text-fg",
                )}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
          <Link to="/about" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-3 text-sm text-muted hover:bg-elevated hover:text-fg">
            About & limits
          </Link>
          <Link to="/feedback" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-3 text-sm text-muted hover:bg-elevated hover:text-fg">
            Feedback
          </Link>
          <DrawerAccount onClose={() => setMenuOpen(false)} />
        </nav>
        <div className="mt-auto grid gap-3 border-t border-border pt-4">
          <Button variant="outline" onClick={toggleTheme}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "Light theme" : "Dark theme"}
          </Button>
        </div>
      </OverlayDialog>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} restoreFocusTo={searchTriggerRef} />
      <main id="main-content">{children}</main>
      <FavouriteRail />
      <footer className="no-print border-t border-border px-5 py-6 text-sm text-muted">
        <div className="mx-auto flex w-[min(1180px,100%)] flex-wrap items-center justify-between gap-3">
          <p>{PARENT_NAME} · not a design stamp</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/" className="hover:text-fg">
              Library
            </Link>
            <Link to="/studio" className="hover:text-fg">
              Studio
            </Link>
            <Link to="/review" className="hover:text-fg">
              Review
            </Link>
            <Link to="/workshop" className="hover:text-fg">
              Project
            </Link>
            <Link to="/about" className="hover:text-fg">
              About & limits
            </Link>
            <Link to="/feedback" className="hover:text-fg">
              Feedback
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function DrawerAccount({ onClose }: { onClose: () => void }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="h-11 animate-pulse rounded-md bg-elevated" />;
  if (!user) {
    return (
      <Link to="/login" onClick={onClose} className="rounded-md px-3 py-3 text-sm hover:bg-elevated">
        Sign in
      </Link>
    );
  }
  return (
    <>
      <Link to="/profile" onClick={onClose} className="rounded-md px-3 py-3 text-sm hover:bg-elevated">
        Profile
      </Link>
      <Link to="/settings" onClick={onClose} className="rounded-md px-3 py-3 text-sm hover:bg-elevated">
        Account settings
      </Link>
    </>
  );
}
