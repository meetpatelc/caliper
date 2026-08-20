import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpenText, ClipboardCheck, Compass, Folder, LayoutGrid, Menu, Moon, Search, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { CommandPalette } from "@/components/command-palette";
import { APP_NAME, MODEL_COUNT } from "@/lib/desk";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Desk", icon: Compass },
  { href: "/library", label: "Library", icon: LayoutGrid },
  { href: "/review", label: "Review", icon: ClipboardCheck },
  { href: "/reference", label: "Methods", icon: BookOpenText },
  { href: "/projects", label: "Projects", icon: Folder },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const { user, isPending } = useCurrentUserState();

  useEffect(() => {
    const stored = localStorage.getItem("caliper-theme") === "light" ? "light" : "dark";
    setTheme(stored);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("caliper-theme", next);
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
        <div className="flex h-14 items-center gap-3 px-3 sm:px-5">
          <button type="button" className="grid size-10 place-items-center rounded-md border border-border lg:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <Menu size={18} />
          </button>
          <Link to="/" className="flex items-center gap-2.5 pr-2">
            <span className="grid size-8 place-items-center rounded-md bg-accent text-accent-fg" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M6 4 L11 20" />
                <path d="M18 4 L13 20" />
                <circle cx="12" cy="7" r="1.6" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span className="leading-none">
              <strong className="block text-xs font-semibold tracking-widest">{APP_NAME}</strong>
              <em className="hidden text-[10px] not-italic text-muted sm:block">{MODEL_COUNT} models · SI-first</em>
            </span>
          </Link>
          <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Primary">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-elevated hover:text-fg",
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
            className="ml-auto hidden min-w-[220px] items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted md:inline-flex"
          >
            <Search size={15} />
            <span className="flex-1 text-left">Search models…</span>
            <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">{shortcut}</kbd>
          </button>
          <button type="button" className="ml-auto grid size-10 place-items-center rounded-md border border-border md:hidden" aria-label="Search" onClick={() => setPaletteOpen(true)}>
            <Search size={16} />
          </button>
          <button type="button" onClick={toggleTheme} className="grid size-10 place-items-center rounded-md border border-border" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <div className="hidden min-w-0 items-center justify-end sm:flex">
            {isPending ? (
              <div className="h-8 w-24 animate-pulse rounded-full bg-elevated" />
            ) : user ? (
              <SignedIn>
                <UserButton />
              </SignedIn>
            ) : (
              <SignedOut>
                <Link to="/login" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-elevated">
                  Sign in
                </Link>
              </SignedOut>
            )}
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-fg/45" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-bg p-5">
            <div className="mb-6 flex items-center justify-between">
              <p className="font-semibold tracking-widest">{APP_NAME}</p>
              <button type="button" className="grid size-9 place-items-center rounded-md border border-border" aria-label="Close" onClick={() => setMenuOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <nav className="grid gap-1">
              {nav.map((item) => {
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
            <div className="mt-auto border-t border-border pt-4">
              {user ? (
                <SignedIn>
                  <UserButton />
                </SignedIn>
              ) : (
                <SignedOut>
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="inline-flex rounded-md border border-border px-3 py-2 text-sm hover:bg-elevated">
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
          <p>Caliper · preliminary models only</p>
          <div className="flex gap-4">
            <Link to="/about" className="hover:text-fg">About & limits</Link>
            <Link to="/feedback" className="hover:text-fg">Feedback</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
