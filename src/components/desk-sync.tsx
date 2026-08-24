import { useLayoutEffect } from "react";
import { toast } from "sonner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { claimDesk, getDesk, type DeskSnapshot } from "@/lib/desk-account";
import { WORKSHOP_KEY } from "@/studio/lib/brand";
import {
  consumeClaimedUnsignedDesk,
  flushAccountWrites,
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
  if (typeof requestAnimationFrame === "function") {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
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
    }
  } catch {
    if (gen !== syncGeneration) return;
    setDeskFallback(true);
    await restoreUnsignedDesk();
    toast.error("Could not load the account desk. Showing this device.");
  } finally {
    if (gen !== syncGeneration) return;
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
  }, [user?.id, isPending]);

  return null;
}
