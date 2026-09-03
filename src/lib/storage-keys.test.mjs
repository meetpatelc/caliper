import assert from "node:assert/strict";
import test from "node:test";
import {
  adopt,
  DESK_KEY,
  inlineAdoptSource,
  readKey,
  THEME_STORAGE_KEY,
  unitsKey,
  WORKSHOP_STORAGE_KEY,
  noticedOnce,
} from "@/lib/storage-keys.ts";

/**
 * Enough of the Storage interface to migrate against.
 *
 * @param {Record<string, string>} [seed]
 */
function fakeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    /** @param {string} key */
    getItem: (key) => (map.has(key) ? map.get(key) ?? null : null),
    /** @param {string} key @param {unknown} value */
    setItem: (key, value) => void map.set(key, String(value)),
    /** @param {string} key */
    removeItem: (key) => void map.delete(key),
    clear: () => map.clear(),
    /** @param {number} index */
    key: (index) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
    snapshot: () => Object.fromEntries(map),
  };
}

test("a value written under the old name is adopted, not abandoned", () => {
  const storage = fakeStorage({ "caliper-desk-v1": '{"favorites":["axial"]}' });
  assert.equal(readKey(/** @type {any} */ (storage), DESK_KEY), '{"favorites":["axial"]}');
  assert.deepEqual(storage.snapshot(), { "desk-v1": '{"favorites":["axial"]}' }, "and the old name is cleared");
});

test("the current name wins when both exist", () => {
  // The old value is stale by definition — something has written the new one
  // since. Letting it shadow newer work would be worse than losing it.
  const storage = fakeStorage({ "desk-v1": "new", "caliper-desk-v1": "old" });
  assert.equal(readKey(/** @type {any} */ (storage), DESK_KEY), "new");
  assert.deepEqual(storage.snapshot(), { "desk-v1": "new" });
});

test("migrating twice does nothing the second time", () => {
  const storage = fakeStorage({ "gauge-workshop": "[]" });
  adopt(/** @type {any} */ (storage), WORKSHOP_STORAGE_KEY);
  const after = storage.snapshot();
  adopt(/** @type {any} */ (storage), WORKSHOP_STORAGE_KEY);
  assert.deepEqual(storage.snapshot(), after);
});

test("nothing to migrate is not an error", () => {
  const storage = fakeStorage();
  assert.equal(readKey(/** @type {any} */ (storage), THEME_STORAGE_KEY), null);
  assert.deepEqual(storage.snapshot(), {});
});

test("a storage that throws does not take the page down with it", () => {
  // A private window, or a browser set to block site data. Losing a migration
  // is survivable; an exception at module scope is not.
  const hostile = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  assert.doesNotThrow(() => adopt(/** @type {any} */ (hostile), DESK_KEY));
  assert.equal(readKey(/** @type {any} */ (hostile), DESK_KEY), null);
});

test("per-tool unit keys carry their own history", () => {
  const storage = fakeStorage({ "instrument-caliper-units:axial": '{"display":{}}' });
  assert.equal(readKey(/** @type {any} */ (storage), unitsKey("axial")), '{"display":{}}');
  assert.deepEqual(storage.snapshot(), { "units:axial": '{"display":{}}' });
});

/**
 * The property that makes this worth having.
 *
 * A rename is one line — push the outgoing name onto `legacy` — and nobody
 * loses anything. Simulated here rather than asserted in prose, because the
 * whole argument for the module is that the *next* rename is cheap, and a claim
 * about the future is exactly the kind that quietly stops being true.
 */
test("a future rename costs one line and loses no data", () => {
  const storage = fakeStorage({ "desk-v1": "the user's work" });
  const renamed = { name: "bench-v1", legacy: ["desk-v1", "caliper-desk-v1"] };
  assert.equal(readKey(/** @type {any} */ (storage), renamed), "the user's work");
  assert.deepEqual(storage.snapshot(), { "bench-v1": "the user's work" });
});

test("no current key name carries a product name", () => {
  // The names are deliberately generic. Two of the four they replaced named
  // products that no longer exist, and one named a product that might.
  const brands = /caliper|gauge|grok|instrument|manus/i;
  for (const key of [DESK_KEY, WORKSHOP_STORAGE_KEY, THEME_STORAGE_KEY, unitsKey("axial")]) {
    assert.ok(!brands.test(key.name), `${key.name} carries a brand`);
    assert.ok(key.legacy.length > 0, `${key.name} should remember what it was called`);
  }
});

test("the inline theme snippet migrates the same way", () => {
  const source = inlineAdoptSource(THEME_STORAGE_KEY);
  assert.match(source, /"theme"/);
  assert.match(source, /instrument-theme/, "the old name has to be in the snippet to be moved");
  assert.match(source, /try\{/, "and it must not throw before paint");
});

test("a notice is noticed once per storage, and marks itself", () => {
  const storage = fakeStorage({});
  const key = { name: "notice-x", legacy: [] };
  assert.equal(noticedOnce(storage, key), false, "first time: not yet noticed");
  assert.equal(noticedOnce(storage, key), true, "second time: already noticed");
  assert.equal(noticedOnce(storage, key), true);
});

test("no storage means show the notice rather than lose it", () => {
  // SSR, or a browser that blocks site data. Erring toward showing is right:
  // the notice explains why saved work appears to have vanished.
  assert.equal(noticedOnce(undefined, { name: "notice-y", legacy: [] }), false);
});

test("a storage that throws is treated as not noticed, and does not throw", () => {
  const broken = {
    getItem() { throw new Error("quota"); },
    setItem() { throw new Error("quota"); },
  };
  assert.doesNotThrow(() => noticedOnce(broken, { name: "notice-z", legacy: [] }));
  assert.equal(noticedOnce(broken, { name: "notice-z", legacy: [] }), false);
});
