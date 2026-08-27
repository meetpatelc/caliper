import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { ICON } from "@instrument/ui";
import type { SafetyTier } from "@/lib/platform";
import { cn } from "@/lib/utils";

/**
 * The tier the catalog already assigned, finally shown.
 *
 * Every model carries `contract.safetyTier`, and the judgement behind it is
 * sound: tier C is the handful where a wrong number has physical consequences —
 * bolt preload, fracture intensity, vacuum holding, a hydraulic line. Until now
 * they rendered exactly like the unit converter, so the work of deciding which
 * models are dangerous was done and then discarded at the last step.
 *
 * Deliberately rendered above the result and outside the error branch. Placing
 * it in `InstrumentMethod` would have been tidier, but that section is
 * suppressed while inputs are invalid — the notice would disappear precisely
 * while somebody is fumbling the inputs of a model that can hurt them.
 */
export function SafetyTierNotice({ tier, className }: { tier: SafetyTier; className?: string }) {
  if (tier !== "C") return null;
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-md border border-danger/40 bg-danger/8 p-3 text-sm leading-6",
        className,
      )}
    >
      <ShieldAlert size={ICON.base} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
      <p className="text-muted">
        <span className="font-medium text-fg">A wrong number here has physical consequences.</span>{" "}
        Check the method and the boundary below before using this result, and have it reviewed by
        someone accountable for the design.
      </p>
    </div>
  );
}

/**
 * The limits, at the result rather than only on /about.
 *
 * The disclaimer was well written and lived one click away, which is no use to
 * the person who arrived on this page from a search engine and will leave from
 * it. Kept to one line plus the model's own boundary so it reads as a
 * qualification of the number above it, not as boilerplate to scroll past.
 */
export function ResultBoundary({ assumptions }: { assumptions: string[] }) {
  return (
    <div className="mt-2 border-t border-border pt-3 text-sm leading-6 text-muted">
      <p className="eyebrow">Valid only within</p>
      <ul className="mt-1.5 grid gap-1">
        {assumptions.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mt-2">
        A first-pass number, not a code check, certification, or approval.{" "}
        <Link to="/about" className="link-accent">
          What this is and is not
        </Link>
        .
      </p>
    </div>
  );
}
