/**
 * Every name this app writes into a browser, in one place, with its history.
 *
 * Four keys carried a product name, and two of those products no longer exist:
 * `caliper-desk-v1` held favourites, projects and saved calculations,
 * `gauge-workshop` held every Build draft, `instrument-theme` held the theme,
 * and `instrument-caliper-units:<tool>` managed two dead brands in one string.
 *
 * Renaming a storage key is not a rename. The old value stays where it is under
 * a name nothing reads any more, and to the person whose browser it is, their
 * saved work has vanished. That cost is what makes a name permanent by
 * accident: nobody wants to be the one who deletes everyone's favourites to fix
 * a word, so the word stays, and it is still there three products later.
 *
 * So the names here are brand-free — `desk`, `workshop`, `theme`, `units` — and
 * each one carries the names it used to have. `adopt` moves a legacy value onto
 * the current name the first time anything looks. Renaming again costs one line
 * in this file: push the outgoing name onto `legacy`, and nobody loses
 * anything.
 *
 * That is the point. Not that these names are better, but that the next rename
 * is cheap, so it can be made for a good reason instead of avoided for a bad
 * one.
 */

export type StorageKey = {
  /** What is written today. */
  readonly name: string;
  /** Names this key has had before, newest first. */
  readonly legacy: readonly string[];
};

/** Favourites, projects, recents and saved calculations. */
export const DESK_KEY: StorageKey = { name: "desk-v1", legacy: ["caliper-desk-v1"] };

/** Build drafts held on the device. */
export const WORKSHOP_STORAGE_KEY: StorageKey = { name: "workshop-v1", legacy: ["gauge-workshop"] };

/** Light or dark, read before paint. */
export const THEME_STORAGE_KEY: StorageKey = { name: "theme", legacy: ["instrument-theme"] };

/** Per-tool unit choices, one key per tool, held for the session only. */
export function unitsKey(toolId: string): StorageKey {
  return { name: `units:${toolId}`, legacy: [`instrument-caliper-units:${toolId}`] };
}

/**
 * Move a legacy value onto the current name, once.
 *
 * Copy-then-remove rather than a read-through fallback, so the migration
 * happens exactly once per browser and nothing has to keep checking forever.
 * The current name always wins: if both exist, the old one is stale and is
 * cleared rather than allowed to shadow newer work.
 *
 * Never throws. Storage access itself can fail — a private window, a browser
 * set to block site data, a quota that is already full — and losing a
 * migration is survivable while a thrown error at module scope is not.
 */
export function adopt(storage: Storage, key: StorageKey): void {
  try {
    const current = storage.getItem(key.name);
    for (const previous of key.legacy) {
      const value = storage.getItem(previous);
      if (value === null) continue;
      if (current === null) storage.setItem(key.name, value);
      storage.removeItem(previous);
      // The list is newest-first, so the first hit is the freshest history
      // worth keeping; anything older is cleared on a later pass.
      if (current === null) return;
    }
  } catch {
    /* A browser that will not let us read is a browser with nothing to move. */
  }
}

/** `adopt`, then read. The one call site everything else should use. */
export function readKey(storage: Storage, key: StorageKey): string | null {
  adopt(storage, key);
  try {
    return storage.getItem(key.name);
  } catch {
    return null;
  }
}

/**
 * The same migration, as source, for the pre-paint theme script.
 *
 * `theme-init.ts` inlines a string into the document head because the theme has
 * to be applied before first paint — it cannot import this module. Generating
 * the snippet here keeps the key list in one place anyway, so a rename still
 * costs one line above.
 */
export function inlineAdoptSource(key: StorageKey): string {
  const legacy = JSON.stringify(key.legacy);
  const name = JSON.stringify(key.name);
  return `(function(){try{var n=${name},L=${legacy},c=localStorage.getItem(n);for(var i=0;i<L.length;i++){var v=localStorage.getItem(L[i]);if(v===null)continue;if(c===null)localStorage.setItem(n,v);localStorage.removeItem(L[i]);if(c===null)break}}catch(e){}})();`;
}

/**
 * Whether this session has already been told its device work is kept apart.
 *
 * Session-scoped, deliberately. The notice explains a state that persists —
 * the device has work, the account has work, they are not merged — and the
 * first version of it fired on every page load for as long as that was true,
 * which for anyone who had ever saved something signed out was every page
 * load forever. Once per browser session says it, and says it again next
 * time you come back, which is the cadence a reminder should have.
 */
export const DESK_SPLIT_NOTICE_KEY: StorageKey = { name: "desk-split-noticed", legacy: [] };

/**
 * Has this been noticed already? Marks it noticed if not. Never throws.
 *
 * Pure over a Storage so it can be tested with a fake, and so the caller
 * decides the scope: pass `sessionStorage` for once-per-session, `localStorage`
 * for once-ever. A storage that cannot be used — private mode, quota — reads
 * as "not noticed", which errs toward showing a notice rather than losing it.
 */
// Only the two methods it uses, so a test can hand it a two-method fake and a
// storage that throws on both, without pretending either is a whole Storage.
export function noticedOnce(storage: Pick<Storage, "getItem" | "setItem"> | undefined, key: StorageKey): boolean {
  if (!storage) return false;
  try {
    if (storage.getItem(key.name)) return true;
    storage.setItem(key.name, "1");
  } catch {
    /* unusable storage: treat as not noticed */
  }
  return false;
}
