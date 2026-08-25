import { useEffect, useState } from "react";

/**
 * False during SSR and on the client's FIRST render, true afterwards.
 *
 * Use it to gate anything whose value the server cannot know — a
 * localStorage-backed store, a client-resolved session — so the server markup
 * and the first client render agree. Without that agreement React reports a
 * hydration mismatch and throws away the whole server tree, which costs the
 * SSR benefit for that page and can flash the wrong content first.
 *
 * Render the same placeholder both sides, then the real value:
 *
 *   const hydrated = useHydrated();
 *   const title = !hydrated ? "Loading." : deskTitle(status);
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
