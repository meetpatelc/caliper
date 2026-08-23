import { useEffect } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { claimDesk, getDesk, type DeskSnapshot } from "@/lib/desk-account";
import { flushAccountWrites, isAccountMode, setAccountMode, setDeskHydrating } from "@/lib/desk-mode";
import { useWorkshop } from "@/gauge/lib/workshop-store";
import { useDeskStore } from "@/lib/workspace-store";

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

async function joinAccountDesk() {
  setAccountMode(true);
  setDeskHydrating(true);
  useWorkshop.setState({ hasHydrated: false });
  try {
    let remote = await getDesk();
    const local = snapshotLocal();
    if (!hasWork(remote) && hasWork(local)) {
      remote = await claimDesk({ data: local });
    }
    applyDesk(remote);
  } catch {
    useWorkshop.setState({ hasHydrated: true });
  } finally {
    setDeskHydrating(false);
    const queued = await flushAccountWrites();
    if (queued) {
      try {
        applyDesk(await getDesk());
      } catch {
        /* keep optimistic memory */
      }
    }
  }
}

async function leaveAccountDesk() {
  if (!isAccountMode()) {
    useWorkshop.setState({ hasHydrated: true });
    return;
  }
  setDeskHydrating(false);
  setAccountMode(false);
  await useDeskStore.persist.rehydrate();
  await useWorkshop.persist.rehydrate();
}

/** Keeps Favourites / Project / Studio on the signed-in account. Recents stay in this browser. */
export function DeskSync() {
  const { user, isPending } = useCurrentUserState();

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      void leaveAccountDesk();
      return;
    }
    void joinAccountDesk();
  }, [user?.id, isPending]);

  return null;
}
