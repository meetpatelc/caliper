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
 * The disclaimer, at the result rather than only on /about.
 *
 * It was well written and lived one click away, which is no use to the person
 * who arrived on this page from a search engine and will leave from it.
 *
 * Deliberately does NOT repeat the model's assumptions. It did at first, and
 * they already render as the "When" column of the method section further down
 * the same page — the identical three lines, twice, a screen apart. Saying a
 * thing twice does not make it read as more important; it makes both copies
 * read as boilerplate, which is the one thing a limits notice cannot afford.
 * The assumptions stay where "Don't" explains them; this carries the one
 * sentence that was genuinely missing.
 */
export function ResultBoundary() {
  return (
    <p className="mt-2 border-t border-border pt-3 text-sm leading-6 text-muted">
      A first-pass number, not a code check, certification, or approval. Read the method and its
      limits below.{" "}
      <Link to="/about" className="link-accent">
        What this is and is not
      </Link>
      .
    </p>
  );
}
