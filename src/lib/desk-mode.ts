import { useSyncExternalStore } from "react";
import type { StateStorage } from "zustand/middleware";
import { toast } from "sonner";
import { createSingleFlight } from "@/lib/single-flight";
import { DESK_KEY, readKey, WORKSHOP_STORAGE_KEY, type StorageKey } from "@/lib/storage-keys";

// The name and its history live in storage-keys.ts, so renaming it again is
// one line there and nobody loses their favourites over a word.
export const DESK_STORAGE_KEY = DESK_KEY.name;

/** The persisted stores that route through {@link accountGuardedStorage}. */
const KEYS_BY_NAME: Record<string, StorageKey> = {
  [DESK_KEY.name]: DESK_KEY,
  [WORKSHOP_STORAGE_KEY.name]: WORKSHOP_STORAGE_KEY,
};

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

/**
 * One in-flight write per key, plus at most one queued behind it.
 *
 * A single Studio publish used to fire six writes for the same draft inside
 * one second — the debounced autosave, the explicit save before validation,
 * and the state update that follows each. All six reached the server and all
 * six returned 200, but the client's own retry budget was spent competing
 * with itself, so the user was told their work had not saved when it had.
 *
 * Single-flight rather than a debounce, because a debounce delays the first
 * write and this is somebody's work: the first save goes immediately, and
 * anything that arrives while it is in flight collapses into one trailing
 * write carrying the latest state. Bursts cost two writes instead of six, and
 * the last thing the user did is always what lands.
 *
 * Keyed, so saving a draft never cancels a favourite.
 */
const accountWrites = createSingleFlight((run) => runAccountWrite(run));

/**
 * `key` identifies the thing being written, not the operation — every save of
 * draft X shares a key so they coalesce. Omitting it opts out of coalescing,
 * which is right for writes that are not last-one-wins (a delete, say).
 */
export function enqueueAccountWrite(run: () => Promise<unknown>, key?: string) {
  if (!accountMode) return;
  const wrapped = () => runAccountWrite(run);
  if (hydrating) {
    pendingWrites.push(wrapped);
    return;
  }
  if (!key) {
    void wrapped().catch(() => {
      /* already toasted */
    });
    return;
  }
  accountWrites.push(key, run);
}

/** Whether any coalesced write is still outstanding (used by the unload guard). */
export function hasPendingAccountWrites() {
  return accountWrites.pending();
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
        // Both persisted stores read through here, so this is the one place a
        // renamed key has to pick up what the old name was holding. `readKey`
        // moves it once and then gets out of the way.
        const key = KEYS_BY_NAME[name];
        return key ? readKey(localStorage, key) : localStorage.getItem(name);
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
