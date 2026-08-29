import assert from "node:assert/strict";
import test from "node:test";
import { FAMILIES, unitsForFamily } from "@/lib/units.ts";
import { inventory } from "@instrument/units";

/**
 * Every unit the engine can convert must be reachable from a picker.
 *
 * `MENU` in `src/lib/units.ts` is a hand-curated list of which units each family
 * offers, and it is the only thing standing between the inventory and the
 * dropdown. `force.kgf` was defined in the inventory, converted correctly by
 * `convertQuantity`, accepted by `resolveUnit`, and absent from `MENU.force` —
 * so it worked everywhere except the one place anyone could pick it.
 *
 * Nothing noticed, because a missing menu entry is not an error. The converter
 * page simply offered four units instead of five, which looks exactly like a
 * converter page offering the units it has.
 */
test("every unit in the inventory is offered by its family's picker", () => {
  const missing = [];
  for (const family of FAMILIES) {
    const offered = new Set(unitsForFamily(family).map((unit) => unit.id));
    const known = inventory.families.find((entry) => entry.id === family)?.units ?? [];
    for (const unit of known) {
      if (!offered.has(unit.id)) missing.push(`${family}: ${unit.symbol} (${unit.id})`);
    }
  }
  assert.deepEqual(missing, [], `units the engine converts but no picker offers:\n  ${missing.join("\n  ")}`);
});

test("kgf is offered under force", () => {
  const force = unitsForFamily("force");
  assert.ok(
    force.some((unit) => unit.label === "kgf"),
    `force offers ${force.map((unit) => unit.label).join(", ")}`,
  );
});

/** The reverse direction: a menu entry naming a unit that does not exist. */
test("no picker offers a unit the engine cannot resolve", () => {
  const unknown = [];
  for (const family of FAMILIES) {
    const known = new Set((inventory.families.find((entry) => entry.id === family)?.units ?? []).map((u) => u.id));
    for (const unit of unitsForFamily(family)) {
      if (!known.has(unit.id)) unknown.push(`${family}: ${unit.id}`);
    }
  }
  assert.deepEqual(unknown, []);
});
