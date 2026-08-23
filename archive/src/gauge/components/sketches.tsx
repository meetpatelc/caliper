type SketchProps = { className?: string };

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 160 72" className={className} aria-hidden="true">
      <rect width="160" height="72" fill="var(--color-surface)" />
      {children}
    </svg>
  );
}

export function Sketch({ slug, className }: { slug: string } & SketchProps) {
  switch (slug) {
    case "axial":
    case "axial-stress":
      return (
        <Frame className={className}>
          <rect x="48" y="18" width="64" height="36" fill="none" stroke="var(--color-fg)" strokeWidth="2" />
          <path d="M20 36 H48 M112 36 H140" stroke="var(--color-mark)" strokeWidth="2" />
          <path d="M20 36 l10 -5 M20 36 l10 5 M140 36 l-10 -5 M140 36 l-10 5" stroke="var(--color-mark)" strokeWidth="2" fill="none" />
        </Frame>
      );
    case "beam-deflection":
      return (
        <Frame className={className}>
          <path d="M24 28 H136" stroke="var(--color-fg)" strokeWidth="3" />
          <path d="M24 28 L20 40 M136 28 L140 40" stroke="var(--color-fg)" strokeWidth="2" />
          <path d="M80 16 V28" stroke="var(--color-mark)" strokeWidth="2" />
          <path d="M80 16 l-5 8 M80 16 l5 8" stroke="var(--color-mark)" strokeWidth="2" fill="none" />
        </Frame>
      );
    case "metric-bolt-area":
      return (
        <Frame className={className}>
          <rect x="68" y="14" width="24" height="44" rx="4" fill="none" stroke="var(--color-fg)" strokeWidth="2" />
          <path d="M68 22 H92 M68 50 H92" stroke="var(--color-fg)" strokeWidth="2" />
          <path d="M80 58 V66" stroke="var(--color-mark)" strokeWidth="2" />
        </Frame>
      );
    case "iso-286-fits":
      return (
        <Frame className={className}>
          <rect x="36" y="18" width="36" height="40" fill="none" stroke="var(--color-fg)" strokeWidth="2" />
          <rect x="92" y="28" width="36" height="24" fill="none" stroke="var(--color-mark)" strokeWidth="2" />
          <path d="M20 38 H140" stroke="var(--color-border)" strokeWidth="1" />
        </Frame>
      );
    case "shaft-torsion":
      return (
        <Frame className={className}>
          <ellipse cx="80" cy="36" rx="28" ry="20" fill="none" stroke="var(--color-fg)" strokeWidth="2" />
          <path d="M80 36 L104 24" stroke="var(--color-mark)" strokeWidth="2" />
        </Frame>
      );
    case "reynolds-number":
    case "pipe-velocity":
      return (
        <Frame className={className}>
          <rect x="18" y="24" width="124" height="24" rx="12" fill="none" stroke="var(--color-fg)" strokeWidth="2" />
          <path d="M40 36 H128" stroke="var(--color-mark)" strokeWidth="2" />
          <path d="M120 36 l-8 -5 M120 36 l-8 5" stroke="var(--color-mark)" strokeWidth="2" fill="none" />
        </Frame>
      );
    case "three-phase-power":
    case "ohm-power":
      return (
        <Frame className={className}>
          <circle cx="52" cy="36" r="14" fill="none" stroke="var(--color-fg)" strokeWidth="2" />
          <path d="M66 36 H110" stroke="var(--color-fg)" strokeWidth="2" />
          <rect x="110" y="26" width="22" height="20" fill="none" stroke="var(--color-mark)" strokeWidth="2" />
        </Frame>
      );
    default:
      return (
        <Frame className={className}>
          <path d="M28 48 A 36 36 0 1 1 132 48" fill="none" stroke="var(--color-fg)" strokeWidth="2" />
          <path d="M80 48 L112 22" stroke="var(--color-mark)" strokeWidth="2" />
          <circle cx="80" cy="48" r="3" fill="var(--color-fg)" />
        </Frame>
      );
  }
}
