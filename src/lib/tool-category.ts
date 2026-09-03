/**
 * The search keywords a model can be filed under.
 *
 * This is not the library's taxonomy, and collapsing it would be a mistake.
 * The Library groups by `contract.domain`; nothing on the site renders
 * `category` at all. Its single consumer is `searchableToolText`, so each of
 * these strings exists to be *typed into the search box* and matched.
 *
 * That is why there are 37 of them and why several look like
 * near-duplicates. "Fasteners" and "Machine elements" overlap as taxonomy and
 * do not overlap as search terms: someone hunting a bolt calculation types one
 * or the other, and merging them deletes a word people search for. The only
 * merge worth making was "Fluids & thermal" into "Thermal & fluids" -- the same
 * two words in the other order, which is one keyword typed twice rather than
 * two keywords.
 *
 * A union rather than `string` so a thirty-ninth variant is a compile error
 * instead of a silent near-miss that matches nothing anyone would guess. To add
 * a genuinely new keyword, add it here first; that is the point.
 *
 * Regenerate the list from the catalogue with:
 *   node --experimental-strip-types --import ./scripts/alias-register.mjs -e \
 *     'import("@/lib/catalog").then(m=>console.log([...new Set(m.tools.map(t=>t.category))].sort().join("\n")))'
 */
export type ToolCategory =
  | "Applied engineering"
  | "Applied fluids"
  | "Applied thermal"
  | "Automation & fixtures"
  | "Automation & robotics"
  | "Dynamics & motion"
  | "Electrical"
  | "Electrical & controls"
  | "Fasteners"
  | "Fluid mechanics"
  | "Fluid power"
  | "Fluid power & automation"
  | "Fluids"
  | "Fundamentals"
  | "GD&T & inspection"
  | "GD&T & quality"
  | "Geometry"
  | "Linear motion"
  | "Machine design"
  | "Machine elements"
  | "Machining & fabrication"
  | "Manufacturing"
  | "Manufacturing planning"
  | "Materials & thermal"
  | "Math & geometry"
  | "Member response"
  | "Motion & automation"
  | "Motion & drives"
  | "Power transmission"
  | "Quality & production"
  | "Quality analysis"
  | "Quick tools"
  | "Stability"
  | "Structural mechanics"
  | "Thermal"
  | "Thermal & fluids"
  | "Thermal systems";
