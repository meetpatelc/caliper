import { Link, useRouterState } from "@tanstack/react-router";
import { ICON } from "@instrument/ui";
import { Menu, Repeat, Search, Star, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccountMenu } from "@/components/account-menu";
import { CommandPalette } from "@/components/command-palette";
import { DeskSync } from "@/components/desk-sync";
import { FamilySwitch } from "@/components/family-switch";
import { FavouriteList, QuickConvert, SideRail } from "@/components/side-rail";
import { OverlayDialog } from "@/components/overlay-dialog";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { SearchTrigger } from "@/components/ui/search";
import { LoadingState } from "@/components/ui/status";
import { PARENT_NAME, SEARCH_EVENT } from "@/lib/instrument";
import { ACCOUNT_NAV, navCurrent, PAGE_NAV, PRIMARY_NAV, SECONDARY_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  /*
   * Two search triggers, one ref, and closing the palette lost the keyboard.
   *
   * The mobile and desktop headers each render a trigger, and the breakpoint
   * hides one with `display: none` rather than unmounting it — so both were
   * always in the DOM, both wrote to the same ref, and the later one won.
   * Restoring focus to a `display: none` button silently does nothing, so on a
   * phone Escape dropped focus to <body> and the next Tab started again from
   * the skip link. On a desktop it worked, which is where it was tested.
   *
   * A ref that resolves at read time to whichever trigger is actually on
   * screen. Kept as a ref rather than a callback because OverlayDialog's
   * `restoreFocusTo` reads `.current` after the dialog has closed, which is
   * exactly when this needs to be re-evaluated.
   */
  const mobileSearchRef = useRef<HTMLButtonElement>(null);
  const desktopSearchRef = useRef<HTMLButtonElement>(null);
  const searchTriggerRef = useMemo(
    () => ({
      get current() {
        const onScreen = (el: HTMLButtonElement | null) => Boolean(el && el.getBoundingClientRect().width > 0);
        if (onScreen(mobileSearchRef.current)) return mobileSearchRef.current;
        if (onScreen(desktopSearchRef.current)) return desktopSearchRef.current;
        return mobileSearchRef.current ?? desktopSearchRef.current;
      },
    }),
    [],
  );
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
        <div className="flex h-14 items-center gap-2 px-3 xl:hidden">
          <FamilySwitch />
          <SearchTrigger
            ref={mobileSearchRef}
            onClick={() => setPaletteOpen(true)}
            aria-label="Search"
            className="min-w-0 flex-1"
          >
            <Search size={ICON.base} className="shrink-0" aria-hidden="true" />
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
            <Menu size={ICON.lead} aria-hidden="true" />
          </Button>
        </div>
        {/*
          xl, not md. The three columns sum wider than the viewport below about
          1024px -- at 768 they measure 128 + 716 + 6, so the right-hand column
          is crushed to six pixels and its contents land on top of the centre
          nav. Signed in it is worse, because the account control is wider than
          "Sign in", which is why an outside review saw it break as far up as
          1180. The mobile header is a complete header, so a tablet loses
          nothing by keeping it.
        */}
        <div className="relative hidden h-14 xl:grid xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:items-center xl:px-5">
          <div className="justify-self-start">
            <FamilySwitch />
          </div>
          <div className="flex items-center justify-center gap-2">
            <nav className="flex flex-wrap items-center gap-0.5 md:gap-1" aria-label="Primary">
              {PRIMARY_NAV.map((item) => {
                const Icon = item.icon;
                const active = item.match(pathname);
                return (
                  // `text-fg` goes on the Button, not the Link: the variant's
                  // `text-muted` lands in the same merge, and tailwind-merge
                  // resolves the className argument last. On the child it lost.
                  <Button key={item.href} asChild variant="ghost" className={cn("text-fg", active && "bg-elevated")}>
                    <Link to={item.href} aria-current={navCurrent(item, pathname)}>
                      <Icon size={ICON.base} />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
            </nav>
            <SearchTrigger
              ref={desktopSearchRef}
              onClick={() => setPaletteOpen(true)}
              aria-label="Search"
              shortcut={shortcut}
              className="w-[min(28rem,32vw)] text-fg"
            >
              <Search size={ICON.base} className="shrink-0" aria-hidden="true" />
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
            <X size={ICON.base} />
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
                  aria-current={navCurrent(item, pathname)}
                  className={cn("w-full justify-start", active && "bg-elevated text-fg")}
                >
                  <Icon size={ICON.base} />
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

        {/* The side tabs' content, for the widths where the tabs are hidden.
            Collapsed by default so the drawer stays a nav first — these are
            things you reach for, not things you scroll past on the way to
            Studio. */}
        <div className="mt-4 grid gap-2 border-t border-border pt-4">
          <details className="group">
            <summary className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-elevated">
              <Star size={ICON.base} aria-hidden="true" />
              Favourites
            </summary>
            <div className="px-3 pb-2 pt-3">
              <FavouriteList onNavigate={() => setMenuOpen(false)} />
            </div>
          </details>
          <details className="group">
            <summary className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-elevated">
              <Repeat size={ICON.base} aria-hidden="true" />
              Convert
            </summary>
            <div className="px-3 pb-2 pt-3">
              <QuickConvert />
            </div>
          </details>
        </div>
        <div className="mt-auto grid gap-3 border-t border-border pt-4">
          <ThemeToggle appearance="labeled" />
        </div>
      </OverlayDialog>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} restoreFocusTo={searchTriggerRef} />
      <DeskSync />
      {/*
         * tabIndex -1 so the skip link actually moves focus. Chromium alone
         * implements the sequential-navigation start point, so the link
         * appeared to work here while landing focus on <body>: nothing was
         * announced, and in Safari the next Tab went back to the header.
         * scroll-mt keeps the sticky header off the landing point.
         */}
      <main id="main-content" tabIndex={-1} className="scroll-mt-16 outline-none">
        {children}
      </main>
      <SideRail />
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
