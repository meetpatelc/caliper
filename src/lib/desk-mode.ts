import { useSyncExternalStore } from "react";
import type { StateStorage } from "zustand/middleware";
import { toast } from "sonner";

export const DESK_STORAGE_KEY = "caliper-desk-v1";

export type DeskStatus = {
  accountMode: boolean;
  hydrating: boolean;
  fallback: boolean;
};

/** True while the in-memory desk is the signed-in account (do not write localStorage). */
let accountMode = false;
/** True while the first account fetch/claim is in flight (queue remote writes). */
let hydrating = false;
/** True when the account desk could not be loaded; unsigned snapshot is showing. */
let fallback = false;
const pendingWrites: Array<() => Promise<unknown>> = [];
const listeners = new Set<() => void>();
let snapshot: DeskStatus = { accountMode: false, hydrating: false, fallback: false };
let writeFailToastAt = 0;

function publish() {
  snapshot = { accountMode, hydrating, fallback };
  for (const listen of listeners) listen();
}

export function subscribeDeskStatus(listen: () => void) {
  listeners.add(listen);
  return () => {
    listeners.delete(listen);
  };
}

export function getDeskStatus(): DeskStatus {
  return snapshot;
}

export function useDeskStatus(): DeskStatus {
  return useSyncExternalStore(subscribeDeskStatus, getDeskStatus, getDeskStatus);
}

export function isAccountMode() {
  return accountMode;
}

export function setAccountMode(value: boolean) {
  if (accountMode === value) {
    if (!value) pendingWrites.length = 0;
    return;
  }
  accountMode = value;
  if (!value) pendingWrites.length = 0;
  publish();
}

export function setDeskHydrating(value: boolean) {
  if (hydrating === value) return;
  hydrating = value;
  publish();
}

export function setDeskFallback(value: boolean) {
  if (fallback === value) return;
  fallback = value;
  publish();
}

export function shouldSyncAccount() {
  return accountMode && !hydrating;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryAccountCall<T>(run: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await run();
    } catch (error) {
      last = error;
      if (i < attempts - 1) await delay(250 * (i + 1));
    }
  }
  throw last;
}

const DESK_WRITE_TOAST = "desk-write";

function notifyWriteFailed() {
  if (!accountMode) return;
  const now = Date.now();
  if (now - writeFailToastAt < 4000) return;
  writeFailToastAt = now;
  toast.error("Could not save on this account. Try again.", { id: DESK_WRITE_TOAST });
}

async function runAccountWrite(run: () => Promise<unknown>) {
  let last: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      const value = await run();
      toast.dismiss(DESK_WRITE_TOAST);
      return value;
    } catch (error) {
      last = error;
      if (i < 2 && accountMode) {
        toast.loading("Still saving on this account…", { id: DESK_WRITE_TOAST });
        await delay(250 * (i + 1));
      }
    }
  }
  notifyWriteFailed();
  throw last;
}

export function enqueueAccountWrite(run: () => Promise<unknown>) {
  if (!accountMode) return;
  const wrapped = () => runAccountWrite(run);
  if (hydrating) {
    pendingWrites.push(wrapped);
    return;
  }
  void wrapped().catch(() => {
    /* already toasted */
  });
}

export async function flushAccountWrites() {
  const batch = pendingWrites.splice(0);
  for (const run of batch) {
    try {
      await run();
    } catch {
      /* runAccountWrite already toasted */
    }
  }
  return batch.length;
}

/** Persist unsigned work only. While signed in, the account is the source of truth. */
export function accountGuardedStorage(): StateStorage {
  return {
    getItem: (name) => {
      try {
        return localStorage.getItem(name);
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      if (accountMode) return;
      try {
        localStorage.setItem(name, value);
      } catch {
        /* private mode */
      }
    },
    removeItem: (name) => {
      if (accountMode) return;
      try {
        localStorage.removeItem(name);
      } catch {
        /* private mode */
      }
    },
  };
}

/**
 * Desk persist: unsigned snapshot stays on this device. Recents always write
 * here — they never go to the account.
 */
export function deskPersistStorage(): StateStorage {
  const base = accountGuardedStorage();
  return {
    getItem: base.getItem,
    removeItem: base.removeItem,
    setItem: (name, value) => {
      if (!accountMode) {
        base.setItem(name, value);
        return;
      }
      try {
        const incoming = JSON.parse(value) as { state?: { recents?: unknown }; version?: number };
        const existingRaw = localStorage.getItem(name);
        const existing = existingRaw
          ? (JSON.parse(existingRaw) as { state?: Record<string, unknown>; version?: number })
          : { state: {} as Record<string, unknown>, version: incoming.version };
        localStorage.setItem(
          name,
          JSON.stringify({
            ...existing,
            state: { ...(existing.state ?? {}), recents: incoming.state?.recents ?? [] },
          }),
        );
      } catch {
        /* private mode */
      }
    },
  };
}

/**
 * After a successful claim, drop the copied Favourites / Project / Review rows
 * from this browser so an emptied account cannot resurrect them. Recents stay.
 */
export function consumeClaimedUnsignedDesk() {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(DESK_STORAGE_KEY);
    const existing = raw
      ? (JSON.parse(raw) as { state?: Record<string, unknown>; version?: number })
      : { state: {} as Record<string, unknown>, version: 0 };
    localStorage.setItem(
      DESK_STORAGE_KEY,
      JSON.stringify({
        ...existing,
        state: {
          ...(existing.state ?? {}),
          favorites: [],
          projects: [],
          calculations: [],
          reviews: [],
          activeProjectId: null,
          recents: existing.state?.recents ?? [],
        },
      }),
    );
  } catch {
    /* private mode */
  }
}
