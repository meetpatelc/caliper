/**
 * Does the header fit the screen it is on?
 *
 * The desktop bar is a three-column grid: family switch, centre nav, and the
 * right-hand cluster (search, theme, account). The outer columns are
 * `minmax(0,1fr)` and can shrink, but the centre one is `auto` and will not —
 * so below a certain width the three columns sum to more than the viewport and
 * the right-hand column is what gives. Measured at 768px on the `md` version
 * it came to 128 + 716 + 6: six pixels for search, theme and account, whose
 * contents then rendered on top of the nav. Signed in it is worse, because the
 * account control is wider than the word "Sign in", which is why an outside
 * review saw the collision as far up as 1180px.
 *
 * None of that is visible to a check that only asks whether the header exists,
 * so this measures the geometry: columns must sum to no more than the viewport,
 * no two controls may overlap, nothing may hang off either edge.
 *
 * The `styled` assertion is not ceremony. `vite preview` serves whatever it
 * loaded at start-up, so after a rebuild it hands out HTML pointing at asset
 * hashes that no longer exist; the stylesheet 404s and the page renders naked.
 * Every geometric assertion here passes on a naked page — no grid, no columns
 * to overflow, nothing positioned to collide. That is how this check reported
 * a clean header at every width from 390 to 1440 while measuring nothing at
 * all. `position: sticky` comes from the stylesheet, so if it is missing the
 * measurements below are worthless and the run says so.
 */
export const HEADER_FIT_WIDTHS = [390, 768, 900, 1024, 1180, 1279, 1280, 1440];

export async function measureHeaderFit(page) {
  return page.evaluate(() => {
    const header = document.querySelector("header");
    if (!header) return { fatal: "no header element" };

    const styled = getComputedStyle(header).position === "sticky";
    const bar = [...header.children].find((child) => child.getBoundingClientRect().height > 0);
    if (!bar) return { fatal: "header has no visible bar", styled };

    const columns = [...bar.children].map((child) => Math.round(child.getBoundingClientRect().width));
    const controls = [...header.querySelectorAll("a, button")]
      .map((el) => {
        const box = el.getBoundingClientRect();
        const name = (el.innerText || el.getAttribute("aria-label") || "control").trim();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, name: name.slice(0, 16) };
      })
      .filter((box) => box.right > box.left && box.bottom > box.top);

    // Half a pixel of slack: sub-pixel layout puts adjacent boxes a hair inside
    // each other on fractional widths, and that is not a collision anyone sees.
    const collisions = [];
    for (let i = 0; i < controls.length; i += 1) {
      for (let j = i + 1; j < controls.length; j += 1) {
        const a = controls[i];
        const b = controls[j];
        const overlaps =
          a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
        if (overlaps) collisions.push(`${a.name}/${b.name}`);
      }
    }

    return {
      styled,
      columns,
      columnSum: columns.reduce((total, width) => total + width, 0),
      viewport: window.innerWidth,
      // The header carries `border-b`, so it is legitimately one pixel taller
      // than its bar. More than that means a second row appeared.
      overhang: Math.round(header.getBoundingClientRect().height - bar.getBoundingClientRect().height),
      collisions,
      escapes: controls.filter((box) => box.right > window.innerWidth + 1 || box.left < -1).map((box) => box.name),
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
}

/** Returns the reasons this width fails, or an empty array if it is sound. */
export function headerFitFaults(measurement) {
  if (!measurement) return ["no measurement"];
  if (measurement.fatal) return [measurement.fatal];
  const faults = [];
  if (!measurement.styled) faults.push("stylesheet did not load — measurements are meaningless");
  if (measurement.columnSum > measurement.viewport) {
    faults.push(`columns sum to ${measurement.columnSum} in ${measurement.viewport} (${measurement.columns.join(" + ")})`);
  }
  if (measurement.overhang > 1) faults.push(`header is ${measurement.overhang}px taller than its bar — it wrapped`);
  if (measurement.collisions.length) faults.push(`overlapping: ${measurement.collisions.join(", ")}`);
  if (measurement.escapes.length) faults.push(`off-screen: ${measurement.escapes.join(", ")}`);
  if (measurement.documentOverflow) faults.push("page scrolls sideways");
  return faults;
}
