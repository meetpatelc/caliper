import { Link } from "@tanstack/react-router";
import { SIBLING } from "@/lib/desk";

export function FamilySwitch() {
  return (
    <nav className="flex shrink-0 items-baseline gap-2 pr-2" aria-label="Caliper and Gauge">
      <Link to="/" className="wordmark">
        CALIPER
      </Link>
      <span className="select-none text-border" aria-hidden="true">
        ·
      </span>
      <a href={SIBLING.url} className="text-[11px] font-semibold tracking-[0.18em] text-muted hover:text-fg">
        GAUGE
      </a>
    </nav>
  );
}
