// @ts-check
/**
 * Classify every source the atlas cites, and count what depends on it.
 *
 *   npm run qa:sources
 *
 * A survey, not a fix. The question behind it is which citations are a
 * liability — a calculator site cited by a calculator site is both a weak
 * provenance claim and an invitation — and answering it needs the count of
 * tools that would move, not just the count of URLs.
 *
 * Kept because the answer changed. The `calculator-site` class below now
 * matches nothing: MechaniCalc, EngineeringToolbox and the rest were replaced
 * with Roark, Shigley and AISC. An empty class is the whole point of leaving
 * it in the list — it is what tells you a citation of that kind has crept
 * back, which reading the registry by hand does not.
 *
 * This sat unmerged on a branch of its own for weeks while the attributions it
 * measures were being fixed, which is the argument for it being a named script
 * rather than a command someone has to remember.
 */
import { sourceRegistry } from "@/lib/platform";
import { tools } from "@/lib/catalog";

/** Host groups, most specific first — a host matches the first class that claims it. */
const CLASSES = [
  {
    id: "standards",
    label: "Standards bodies, government, national labs",
    hosts: ["nist.gov", "itl.nist.gov", "gsa.gov", "grc.nasa.gov", "www1.grc.nasa.gov", "txdot.gov", "iso.org", "ntrs.nasa.gov"],
  },
  {
    id: "academic",
    label: "Textbooks, universities, open courseware",
    hosts: [
      "openstax.org", "bu.edu", "engineeringstatics.org", "eng.libretexts.org", "solidmechanics.org",
      "mechref.org", "uta.pressbooks.pub", "utw10945.utweb.utexas.edu", "eaglepubs.erau.edu",
      "wp.optics.arizona.edu", "hyperphysics.phy-astr.gsu.edu", "mdpi.com", "engineeringtechnology.org",
    ],
  },
  {
    id: "encyclopedia",
    label: "Wikipedia",
    hosts: ["en.wikipedia.org"],
  },
  {
    id: "calculator-site",
    label: "Calculator and reference sites — the same product class",
    hosts: [
      "engineeringtoolbox.com", "engineersedge.com", "engineeringlibrary.org", "amesweb.info",
      "katmarsoftware.com", "x-engineer.org", "mathwords.com", "gdandtbasics.com",
      "accendoreliability.com", "6sigma.us", "oee.com", "drivetrainhub.com", "khkgears.net",
      "abbottaerospace.com", "epi-eng.com",
    ],
  },
  {
    id: "trade-press",
    label: "Trade press and vendor blogs",
    hosts: [
      "linearmotiontips.com", "blog.orientalmotor.com", "motioncontroltips.com", "fluidpowerworld.com",
      "machinedesign.com", "electronics-cooling.com", "cadem.com", "goengineer.com", "tulip.co",
      "motioncontrolsrobotics.com", "hydraulicsonline.com", "sendcutsend.com",
    ],
  },
];

/** Anything unclaimed is a manufacturer's own technical page. */
const VENDOR = { id: "vendor", label: "Manufacturer technical pages" };
/** No URL at all: a book. Roark, Shigley and friends. */
const BOOK = { id: "book", label: "Books, cited by title (no URL)" };

/** @param {string} url */
function hostOf(url) {
  if (!url.trim()) return "";
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** @param {string} url */
function classOf(url) {
  const host = hostOf(url);
  if (!host) return BOOK;
  for (const group of CLASSES) if (group.hosts.includes(host)) return group;
  return VENDOR;
}

/** How many tools cite each source id. */
const citations = new Map();
for (const tool of tools) {
  for (const id of tool.contract.sourceIds ?? []) {
    citations.set(id, (citations.get(id) ?? 0) + 1);
  }
}

const byClass = new Map();
for (const record of sourceRegistry) {
  const group = classOf(record.url);
  const bucket = byClass.get(group.id) ?? { label: group.label, records: [], tools: 0 };
  bucket.records.push(record);
  bucket.tools += citations.get(record.id) ?? 0;
  byClass.set(group.id, bucket);
}

const order = [...CLASSES.map((c) => c.id), VENDOR.id, BOOK.id];
console.log(`${sourceRegistry.length} source records, cited by ${tools.length} tools.\n`);

for (const id of order) {
  const bucket = byClass.get(id);
  if (!bucket) continue;
  console.log(`${bucket.label}`);
  console.log(`  ${bucket.records.length} records · ${bucket.tools} tool citations`);
  const hosts = new Map();
  for (const record of bucket.records) {
    const host = hostOf(record.url) || "(book)";
    hosts.set(host, (hosts.get(host) ?? 0) + 1);
  }
  const top = [...hosts.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`  ${top.map(([host, n]) => `${host}×${n}`).join(", ")}`);
  console.log("");
}

// The list that actually needs a decision, with the tools that would move.
const risky = byClass.get("calculator-site");
if (risky) {
  console.log("--- calculator-site citations, with the tools that would move ---");
  for (const record of risky.records.sort((a, b) => (citations.get(b.id) ?? 0) - (citations.get(a.id) ?? 0))) {
    const users = tools.filter((tool) => (tool.contract.sourceIds ?? []).includes(record.id)).map((tool) => tool.id);
    console.log(`  ${record.id} — ${hostOf(record.url)} — ${users.length ? users.join(", ") : "(uncited)"}`);
  }
}
