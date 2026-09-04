import { createFileRoute, Link } from "@tanstack/react-router";
import { jsonLdScript, pageJsonLd, seoLinks, seoMeta } from "@/lib/seo";
import { ICON } from "@instrument/ui";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { PARENT_NAME } from "@/lib/instrument";
import { panelClass } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/about")({   head: () => ({
    meta: seoMeta({ title: "About & limits · Instrument", description: "What Instrument is designed to support, and what it is not.", path: "/about" }),
    links: seoLinks("/about"),
    scripts: jsonLdScript(pageJsonLd("AboutPage", { title: "About & limits · Instrument", description: "What Instrument is designed to support, and what it is not.", path: "/about" })),
  }),
  component: AboutPage });

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
      <PageHeader
        kicker={`About ${PARENT_NAME}`}
        title="One product. Four parts."
        ledeClassName="max-w-none"
        lede={
          <>
            <p>
              {PARENT_NAME} is a calculator you can check: the formula sits next to the number.{" "}
              <Link to="/" className="link-accent">
                Library
              </Link>{" "}
              is the finished models — open one and get a number.{" "}
              <Link to="/studio" className="link-accent">
                Build
              </Link>{" "}
              is where you write a model.{" "}
              <Link to="/review" className="link-accent">
                Review
              </Link>{" "}
              is evidence checklists, a trade study, and FMEA you control.{" "}
              <Link to="/workshop" className="link-accent">
                Project
              </Link>{" "}
              is drafts, saved checks, and review snapshots — on this device until you sign in, then on your account. Method, assumptions, and limits also sit on each model.
            </p>
            <p className="mt-4">
              Saving a snapshot or a draft does not require an account. Sign in and that work can follow you.
            </p>
          </>
        }
      />
      <p className="eyebrow mt-8">Preliminary only · project context required · independent review</p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <div className={cn(panelClass, "border-ok/30 p-5")}>
          <p className="eyebrow text-ok">Designed to support</p>
          <ul className="mt-4 grid gap-3 text-sm leading-6">
            {suitable.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2 size={ICON.base} className="mt-0.5 text-ok" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className={cn(panelClass, "border-mark/40 p-5")}>
          <p className="eyebrow text-mark">Not provided</p>
          <ul className="mt-4 grid gap-3 text-sm leading-6">
            {unsuitable.map((item) => (
              <li key={item} className="flex gap-2">
                <CircleAlert size={ICON.base} className="mt-0.5 text-mark" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-8 text-sm text-muted">
        Found a model issue?{" "}
        <Link to="/feedback" className="link-accent">
          Send feedback
        </Link>
        .
      </p>
    </div>
  );
}
