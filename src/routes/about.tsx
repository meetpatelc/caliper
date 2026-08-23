import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { tools } from "@/lib/catalog";
import { PARENT_NAME } from "@/lib/instrument";

export const Route = createFileRoute("/about")({ component: AboutPage });

const suitable = [
  "Engineering explanation and independent study.",
  "Preliminary, transparent checks inside the stated model boundary.",
  "Comparing compatible quantities while keeping units explicit.",
  "Authoring a unit-aware calculator with method and assumptions attached.",
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
      <p className="eyebrow">About {PARENT_NAME}</p>
      <h1 className="display-title mt-4">One product. Four rooms.</h1>
      <p className="mt-5 text-base leading-7 text-muted">
        {PARENT_NAME} is a calculator you can trust because the model is in the frame.{" "}
        <Link to="/" className="text-accent">
          Library
        </Link>{" "}
        is {tools.length} finished models — open one and get a number.{" "}
        <Link to="/studio" className="text-accent">
          Studio
        </Link>{" "}
        is where you write a model.{" "}
        <Link to="/review" className="text-accent">
          Review
        </Link>{" "}
        is evidence checklists, a trade study, and FMEA you control.{" "}
        <Link to="/workshop" className="text-accent">
          Project
        </Link>{" "}
        is drafts, saved checks, and review snapshots on this device. Method, assumptions, and limits also sit on each model.
      </p>
      <p className="mt-4 text-base leading-7 text-muted">
        Saving a snapshot or a Studio draft does not require an account.
      </p>
      <p className="eyebrow mt-6">Preliminary only · project context required · independent review</p>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <div className="rounded-lg border border-ok/30 p-5">
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
        <div className="rounded-lg border border-mark/40 p-5">
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
        Found a model issue?{" "}
        <Link to="/feedback" className="text-accent">
          Send feedback
        </Link>
        .
      </p>
    </div>
  );
}
