/**
 * Keyed single-flight with a trailing write.
 *
 * One save runs at a time per key. Anything arriving while it is in flight
 * collapses into a single pending write carrying the newest state, which runs
 * when the current one finishes.
 *
 * Why not a debounce: a debounce delays the first write, and this is somebody's
 * work. Here the first save leaves immediately and only the pile-up behind it
 * is collapsed — a burst costs two writes instead of six, and the last thing
 * the user did is always what lands.
 *
 * Deliberately free of toasts, stores and network code so the behaviour can be
 * tested without a DOM. The caller supplies whatever "run a write" means.
 */
export type SingleFlight = {
  /** Queue `run` under `key`, coalescing with anything already pending there. */
  push: (key: string, run: () => Promise<unknown>) => void;
  /** True while any key has work in flight or waiting. */
  pending: () => boolean;
};

export function createSingleFlight(
  /** Runs one write. Rejections are swallowed so a failure cannot wedge the key. */
  execute: (run: () => Promise<unknown>) => Promise<unknown>,
): SingleFlight {
  type Slot = { inFlight: boolean; next?: () => Promise<unknown> };
  const slots = new Map<string, Slot>();

  async function drain(key: string) {
    const slot = slots.get(key);
    if (!slot || slot.inFlight) return;
    slot.inFlight = true;
    try {
      while (slot.next) {
        const run = slot.next;
        slot.next = undefined;
        try {
          await execute(run);
        } catch {
          // Already reported by `execute`. Keep draining so a later write —
          // which carries newer state — still gets its chance to land.
        }
      }
    } finally {
      slot.inFlight = false;
      if (!slot.next) slots.delete(key);
    }
  }

  return {
    push(key, run) {
      const slot = slots.get(key) ?? { inFlight: false };
      slot.next = run; // a newer write for the same thing replaces the pending one
      slots.set(key, slot);
      void drain(key);
    },
    pending() {
      for (const slot of slots.values()) if (slot.inFlight || slot.next) return true;
      return false;
    },
  };
}
