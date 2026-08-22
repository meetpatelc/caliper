import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpenText, ClipboardCheck, Compass, Folder, LayoutGrid, Menu, Moon, Search, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { CommandPalette } from "@/components/command-palette";
import { Button, buttonVariants } from "@/components/ui/button";
import { SIBLING } from "@/lib/desk";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/", label: "Desk", icon: Compass },
  { href: "/library", label: "Library", icon: LayoutGrid },
] as const;

const moreNav = [
  { href: "/projects", label: "Projects", icon: Folder },
  { href: "/review", label: "Review", icon: ClipboardCheck },
  { href: "/reference", label: "Methods", icon: BookOpenText },
] as const;

const drawerNav = [...primaryNav, ...moreNav];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const { user, isPending } = useCurrentUserState();

  useEffect(() => {
    const stored = localStorage.getItem("caliper-metrology-theme") === "dark" ? "dark" : "light";
    setTheme(stored);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    const onOpenSearch = () => setPaletteOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("caliper:open-search", onOpenSearch);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("caliper:open-search", onOpenSearch);
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("caliper-metrology-theme", next);
    document.documentElement.classList.toggle("light", next === "light");
    document.documentElement.classList.toggle("dark", next !== "light");
  };

  const shortcut = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform) ? "⌘K" : "Ctrl K";

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
      >
        Skip to content
      </a>
      <header className="no-print sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-5">
          <Link to="/" className="wordmark shrink-0 pr-2">
            CALIPER
          </Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    active && "bg-elevated text-fg",
                  )}
                >
                  <Icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className={cn(buttonVariants({ variant: "outline" }), "min-w-0 flex-1 justify-start gap-2 bg-surface font-normal text-muted hover:border-accent hover:text-fg md:max-w-xl")}
          >
            <Search size={15} className="shrink-0" />
            <span className="flex-1 truncate text-left">Search models…</span>
            <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] md:inline">{shortcut}</kbd>
          </button>
          <details className="more-menu relative hidden lg:block">
            <summary className={cn(buttonVariants({ variant: "ghost" }), "cursor-pointer list-none")}>
              More
            </summary>
            <div className="absolute right-0 z-40 mt-1 w-44 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-menu">
              {moreNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-elevated"
                  >
                    <Icon size={14} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </details>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="hidden sm:inline-flex"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
          <div className="hidden min-w-0 items-center justify-end sm:flex">
            {isPending ? (
              <div className="h-8 w-24 animate-pulse rounded-full bg-elevated" />
            ) : user ? (
              <SignedIn>
                <UserButton />
              </SignedIn>
            ) : (
              <SignedOut>
                <Link to="/login" className={buttonVariants({ variant: "outline" })}>
                  Sign in
                </Link>
              </SignedOut>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 lg:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={18} />
          </Button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-fg/45" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-72 flex-col border-l border-border bg-bg p-5">
            <div className="mb-6 flex items-center justify-between">
              <p className="wordmark">CALIPER</p>
              <Button variant="outline" size="icon" className="size-9" aria-label="Close" onClick={() => setMenuOpen(false)}>
                <X size={16} />
              </Button>
            </div>
            <nav className="grid gap-1">
              {drawerNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} to={item.href} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-3 text-sm hover:bg-elevated">
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
            </nav>
            <div className="mt-auto grid gap-3 border-t border-border pt-4">
              <Button variant="outline" onClick={toggleTheme}>
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                {theme === "dark" ? "Light theme" : "Dark theme"}
              </Button>
              {user ? (
                <SignedIn>
                  <UserButton />
                </SignedIn>
              ) : (
                <SignedOut>
                  <Link to="/login" onClick={() => setMenuOpen(false)} className={buttonVariants()}>
                    Sign in
                  </Link>
                </SignedOut>
              )}
            </div>
          </aside>
        </div>
      )}

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <main id="main-content">{children}</main>
      <footer className="no-print border-t border-border px-5 py-6 text-sm text-muted">
        <div className="mx-auto flex w-[min(1180px,100%)] flex-wrap items-center justify-between gap-3">
          <p>Caliper · ready desk, not a design stamp</p>
          <div className="flex flex-wrap gap-4">
            <a href={SIBLING.url} className="hover:text-fg">{SIBLING.name}</a>
            <Link to="/projects" className="hover:text-fg">Projects</Link>
            <Link to="/review" className="hover:text-fg">Review</Link>
            <Link to="/reference" className="hover:text-fg">Methods</Link>
            <Link to="/about" className="hover:text-fg">About & limits</Link>
            <Link to="/feedback" className="hover:text-fg">Feedback</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
