import { useEffect, useLayoutEffect } from "react";
import { toast } from "sonner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { claimDesk, getDesk, type DeskSnapshot } from "@/lib/desk-account";
import { WORKSHOP_KEY } from "@/studio/lib/brand";
import {
  consumeClaimedUnsignedDesk,
  flushAccountWrites,
  hasPendingAccountWrites,
  isAccountMode,
  retryAccountCall,
  setAccountMode,
  setDeskFallback,
  setDeskHydrating,
} from "@/lib/desk-mode";
import { useWorkshop } from "@/studio/lib/workshop-store";
import { useDeskStore } from "@/lib/workspace-store";

let syncGeneration = 0;

function snapshotLocal(): DeskSnapshot {
  const desk = useDeskStore.getState();
  return {
    favorites: desk.favorites,
    projects: desk.projects,
    calculations: desk.calculations,
    reviews: desk.reviews,
    drafts: JSON.parse(JSON.stringify(useWorkshop.getState().items)) as DeskSnapshot["drafts"],
  };
}

function hasWork(desk: DeskSnapshot) {
  return (
    desk.favorites.length +
      desk.projects.length +
      desk.calculations.length +
      desk.reviews.length +
      desk.drafts.length >
    0
  );
}

function applyDesk(desk: DeskSnapshot) {
  const current = useDeskStore.getState();
  const activeStillHere = desk.projects.some((project) => project.id === current.activeProjectId);
  useDeskStore.setState({
    favorites: desk.favorites as typeof current.favorites,
    projects: desk.projects,
    calculations: desk.calculations,
    reviews: desk.reviews,
    activeProjectId: activeStillHere ? current.activeProjectId : (desk.projects[0]?.id ?? null),
  });
  useWorkshop.setState({ items: desk.drafts, hasHydrated: true });
}

function blankAccountView() {
  const recents = useDeskStore.getState().recents;
  useDeskStore.setState({
    favorites: [],
    projects: [],
    calculations: [],
    reviews: [],
    activeProjectId: null,
    recents,
  });
  useWorkshop.setState({ items: [], hasHydrated: false });
}

function consumeClaimedWorkshop() {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(WORKSHOP_KEY);
    const existing = raw
      ? (JSON.parse(raw) as { state?: Record<string, unknown>; version?: number })
      : { state: {} as Record<string, unknown>, version: 0 };
    localStorage.setItem(
      WORKSHOP_KEY,
      JSON.stringify({
        ...existing,
        state: { ...(existing.state ?? {}), items: [] },
      }),
    );
  } catch {
    /* private mode */
  }
}

async function restoreUnsignedDesk() {
  setAccountMode(false);
  await useDeskStore.persist.rehydrate();
  await useWorkshop.persist.rehydrate();
  useWorkshop.setState({ hasHydrated: true });
}

async function joinAccountDesk() {
  const local = isAccountMode()
    ? { favorites: [], projects: [], calculations: [], reviews: [], drafts: [] }
    : snapshotLocal();
  const gen = ++syncGeneration;
  setDeskFallback(false);
  setAccountMode(true);
  setDeskHydrating(true);
  blankAccountView();
  // Let the blanked view paint before the account data lands, so the desk does
  // not flash the device's work and then swap it.
  //
  // Raced against a timer rather than awaited outright: `requestAnimationFrame`
  // does not fire in a hidden tab, and this was a hard barrier. Sign in, switch
  // tabs while it loads — which is exactly when someone switches tabs — and the
  // desk sat on "Loading the account desk" until the tab was looked at again.
  // The request had not even been sent. A frame is a nicety; the data is not.
  if (typeof requestAnimationFrame === "function") {
    await Promise.race([
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      }),
      new Promise<void>((resolve) => setTimeout(resolve, 50)),
    ]);
  }
  if (gen !== syncGeneration) return;
  try {
    let remote = await retryAccountCall(() => getDesk());
    if (gen !== syncGeneration) return;
    let claimed = false;
    if (!hasWork(remote) && hasWork(local)) {
      remote = await retryAccountCall(() => claimDesk({ data: local }));
      claimed = hasWork(remote);
    }
    if (gen !== syncGeneration) return;
    applyDesk(remote);
    if (claimed) {
      consumeClaimedUnsignedDesk();
      consumeClaimedWorkshop();
    } else if (hasWork(local)) {
      // Work on this device is only claimed into an empty account, so that
      // signing in can never duplicate or overwrite what the account already
      // holds. That is the right rule, but silently it looks like data loss:
      // the drafts on screen a moment ago are simply gone. They are still on
      // the device — `consumeClaimedUnsignedDesk` runs only on the claim path —
      // so say so rather than leaving the person to guess.
      toast("This device had its own work, kept separate from the account.", {
        description: "The account already had work, so the two were not merged. Sign out to see the device copy again.",
        duration: 8000,
      });
    }
  } catch {
    if (gen !== syncGeneration) return;
    setDeskFallback(true);
    await restoreUnsignedDesk();
    toast.error("Could not load the account desk. Showing this device.");
  } finally {
    // Guarded block, not an early return — a `return` here would also swallow
    // any exception already unwinding out of the catch above.
    if (gen === syncGeneration) {
      setDeskHydrating(false);
      const queued = await flushAccountWrites();
      if (queued && gen === syncGeneration) {
        try {
          applyDesk(await getDesk());
        } catch {
          /* keep optimistic memory */
        }
      }
    }
  }
}

async function leaveAccountDesk() {
  syncGeneration += 1;
  setDeskHydrating(false);
  setDeskFallback(false);
  const wasAccount = isAccountMode();
  if (!wasAccount) {
    useWorkshop.setState({ hasHydrated: true });
    return;
  }
  await restoreUnsignedDesk();
}

/** Keeps Favourites / Project / Studio on the signed-in account. Recents stay in this browser. */
export function DeskSync() {
  const { user, isPending } = useCurrentUserState();

  useLayoutEffect(() => {
    if (isPending) return;
    if (!user) {
      void leaveAccountDesk();
      return;
    }
    void joinAccountDesk();
    // Keyed on the user IDENTITY, not the user object. `useSession` returns a
    // fresh object on every poll, so depending on `user` would re-run the full
    // desk join — a remote fetch that blanks and repopulates the store — on
    // every session refresh. Only `user?.id` changing means a different person.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isPending]);

  // Coalescing means a save can still be queued when the tab goes away. Warn
  // rather than lose it — the browser only honours this if the user has
  // interacted with the page, which by definition they have if a write is
  // pending. Nothing is shown when nothing is outstanding.
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (!hasPendingAccountWrites()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, []);

  return null;
}
