import type { StateStorage } from "zustand/middleware";

/** True while the in-memory desk is the signed-in account (do not write localStorage). */
let accountMode = false;
/** True while the first account fetch/claim is in flight (queue remote writes). */
let hydrating = false;
const pendingWrites: Array<() => Promise<unknown>> = [];

export function isAccountMode() {
  return accountMode;
}

export function setAccountMode(value: boolean) {
  accountMode = value;
  if (!value) pendingWrites.length = 0;
}

export function setDeskHydrating(value: boolean) {
  hydrating = value;
}

export function shouldSyncAccount() {
  return accountMode && !hydrating;
}

export function enqueueAccountWrite(run: () => Promise<unknown>) {
  if (!accountMode) return;
  if (hydrating) {
    pendingWrites.push(run);
    return;
  }
  void run().catch(() => {
    /* signed-out or network */
  });
}

export async function flushAccountWrites() {
  const batch = pendingWrites.splice(0);
  for (const run of batch) {
    try {
      await run();
    } catch {
      /* signed-out or network */
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
