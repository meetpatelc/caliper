import { Link } from "@tanstack/react-router";
import { PARENT_WORDMARK } from "@/lib/instrument";

export function FamilySwitch() {
  return (
    <Link to="/" aria-label="Instrument home" className="wordmark shrink-0 pr-1 text-sm tracking-[0.22em] sm:pr-2">
      {PARENT_WORDMARK}
    </Link>
  );
}
