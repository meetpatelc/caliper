import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { tools } from "@/lib/catalog";

export const Route = createFileRoute("/about")({ component: AboutPage });

const suitable = [
  "Engineering explanation and independent study.",
  "Preliminary, transparent checks inside the stated model boundary.",
  "Comparing compatible quantities while keeping units explicit.",
  "Building intuition before using a project-specific approved process.",
];

const unsuitable = [
  "A design certification, sealed calculation, or automatic compliance decision.",
  "A replacement for applicable codes, local amendments, specifications, or manufacturer data.",
  "A substitute for measurement quality, connection behavior, fabrication detail, or qualified judgment.",
  "Any use beyond the geometry, loading, material, and boundary assumptions shown in a workspace.",
];

function AboutPage() {
  return (
    <div className="page-wrap max-w-3xl">
      <p className="eyebrow">About Caliper</p>
      <h1 className="display-title mt-4">Clear limits make a better engineering tool.</h1>
      <p className="mt-5 text-base leading-7 text-muted">
        Caliper is a public, local-first mechanical workspace for transparent preliminary calculation. {tools.length} models run in the browser. Saving a snapshot does not require an account.
      </p>
      <p className="mt-6 font-mono text-[11px] tracking-[0.14em] text-muted">PRELIMINARY ONLY · PROJECT CONTEXT REQUIRED · INDEPENDENT REVIEW</p>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-ok/30 p-5">
          <p className="eyebrow text-ok">Designed to support</p>
          <ul className="mt-4 grid gap-3 text-sm leading-6">
            {suitable.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2 size={16} className="mt-0.5 text-ok" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-mark/40 p-5">
          <p className="eyebrow text-mark">Not provided</p>
          <ul className="mt-4 grid gap-3 text-sm leading-6">
            {unsuitable.map((item) => (
              <li key={item} className="flex gap-2">
                <CircleAlert size={16} className="mt-0.5 text-mark" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-10 text-sm text-muted">
        Found a model issue? <Link to="/feedback" className="text-accent">Send feedback</Link>.
      </p>
    </div>
  );
}
