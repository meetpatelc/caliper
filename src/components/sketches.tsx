import type { ReactNode } from "react";
import { getTool, type ToolId } from "@/lib/catalog";

function Plate({ label, children, viewBox = "0 0 440 168" }: { label: string; children: ReactNode; viewBox?: string }) {
  return (
    <svg viewBox={viewBox} className="h-36 w-full max-w-lg text-fg" role="img" aria-label={label} fill="none">
      {children}
    </svg>
  );
}

const ink = { stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const dim = { stroke: "currentColor", strokeWidth: 1, opacity: 0.55 };

function T({ x, y, children, anchor = "middle", accent = false }: { x: number | string; y: number | string; children: ReactNode; anchor?: "start" | "middle" | "end"; accent?: boolean }) {
  return (
    <text x={x} y={y} textAnchor={anchor} className={accent ? "fill-accent" : "fill-muted"} fontSize="11" fontFamily="IBM Plex Mono, ui-monospace, monospace">
      {children}
    </text>
  );
}

export function AxialSketch() {
  return (
    <Plate label="Prismatic bar in tension">
      <path d="M86 84 H354" {...ink} />
      <rect x="148" y="70" width="144" height="28" className="fill-surface" {...ink} />
      <path d="M86 84 L108 74 M86 84 L108 94" className="text-accent" {...ink} />
      <path d="M354 84 L332 74 M354 84 L332 94" className="text-accent" {...ink} />
      <path d="M148 118 H292" {...dim} />
      <path d="M148 112 V124 M292 112 V124" {...dim} />
      <T x="70" y="80" accent>F</T>
      <T x="370" y="80" accent>F</T>
      <T x="220" y="138">L</T>
    </Plate>
  );
}

/*
 * Load arrows point the way the load acts: the head sits on the thing being
 * loaded, and the tail is out in the space the label lives in.
 *
 * Six of them were drawn the other way round, head outward, which reads as the
 * load pulling away from the body. The clearest tell was inside a single
 * drawing: BeamDiagramSketch renders the distributed load w correctly pointing
 * down onto the span, and the point load P beside it pointing up off it. The
 * column labelled "central compression" had both arrows pulling outward, which
 * is tension -- on the buckling model. And the cylinder had its supply pressure
 * pointing away from the bore it acts on.
 *
 * SpringSketch and the tension bar were already right, and are the convention
 * the rest now follow.
 */
export function BeamDiagramSketch() {
  return (
    <Plate label="Simply supported span with point load and uniform load">
      <path d="M70 88 H370" {...ink} />
      <path d="M90 88 L78 114 H102 Z" {...ink} />
      <path d="M350 88 L338 114 H362 Z" {...ink} />
      <path d="M90 44 H350" className="text-accent" {...ink} />
      <path d="M110 44 V56 M150 44 V56 M190 44 V56 M230 44 V56 M270 44 V56 M310 44 V56" className="text-accent" {...ink} />
      <path d="M110 56 L104 50 M110 56 L116 50 M190 56 L184 50 M190 56 L196 50 M270 56 L264 50 M270 56 L276 50" className="text-accent" {...ink} />
      <path d="M186 88 V62" className="text-accent" {...ink} />
      <path d="M186 88 L178 76 M186 88 L194 76" className="text-accent" {...ink} />
      <T x="200" y="56" accent>P</T>
      <T x="220" y="38" accent>w</T>
      <path d="M90 132 H350" {...dim} />
      <path d="M90 126 V138 M350 126 V138" {...dim} />
      <T x="220" y="152">L</T>
      <path d="M90 70 H186" {...dim} />
      <T x="138" y="66">a</T>
    </Plate>
  );
}

export function BeamSketch({ cantilever }: { cantilever?: boolean }) {
  return (
    <Plate label={cantilever ? "Cantilever with end point load" : "Simply supported beam, center load"}>
      {cantilever ? (
        <>
          <path d="M90 50 V118" {...ink} />
          <path d="M82 58 H98 M82 70 H98 M82 82 H98 M82 94 H98 M82 106 H98" {...ink} />
          <path d="M90 84 H340" {...ink} />
          <path d="M340 84 V52" className="text-accent" {...ink} />
          <path d="M340 84 L332 72 M340 84 L348 72" className="text-accent" {...ink} />
          <T x="352" y="48" accent>P</T>
          <path d="M90 130 H340" {...dim} />
          <T x="215" y="148">L</T>
        </>
      ) : (
        <>
          <path d="M80 84 H360" {...ink} />
          <path d="M100 84 L88 108 H112 Z" {...ink} />
          <path d="M340 84 L328 108 H352 Z" {...ink} />
          <path d="M220 84 V52" className="text-accent" {...ink} />
          <path d="M220 84 L212 72 M220 84 L228 72" className="text-accent" {...ink} />
          <T x="232" y="48" accent>P</T>
          <path d="M100 130 H340" {...dim} />
          <T x="220" y="148">L</T>
        </>
      )}
    </Plate>
  );
}

export function ColumnSketch() {
  return (
    <Plate label="Slender column, central compression">
      <rect x="196" y="36" width="48" height="100" className="fill-surface" {...ink} />
      <path d="M220 36 V18" className="text-accent" {...ink} />
      <path d="M220 36 L212 26 M220 36 L228 26" className="text-accent" {...ink} />
      <path d="M220 136 V154" className="text-accent" {...ink} />
      <path d="M220 136 L212 146 M220 136 L228 146" className="text-accent" {...ink} />
      <T x="246" y="24" accent>P</T>
      <path d="M260 36 V136" {...dim} />
      <T x="274" y="92">KL</T>
    </Plate>
  );
}

export function CylinderSketch() {
  return (
    <Plate label="Right circular cylinder">
      <ellipse cx="120" cy="84" rx="22" ry="40" {...ink} />
      <path d="M120 44 H320" {...ink} />
      <path d="M120 124 H320" {...ink} />
      <ellipse cx="320" cy="84" rx="22" ry="40" className="fill-surface" {...ink} />
      <path d="M120 140 H320" {...dim} />
      <T x="220" y="156">L</T>
      <path d="M352 44 V124" {...dim} />
      <T x="368" y="88">D</T>
    </Plate>
  );
}

export function ActuatorSketch({ family }: { family: "air" | "oil" }) {
  return (
    <Plate label={family === "air" ? "Pneumatic cylinder, bore and rod" : "Hydraulic cylinder, bore and rod"}>
      <rect x="72" y="52" width="220" height="64" rx="3" className="fill-surface" {...ink} />
      <rect x="72" y="52" width="14" height="64" {...ink} />
      <rect x="278" y="52" width="14" height="64" {...ink} />
      <rect x="168" y="58" width="14" height="52" className="fill-bg text-accent" stroke="currentColor" strokeWidth="1.75" />
      <rect x="182" y="78" width="168" height="12" className="fill-surface" {...ink} />
      <path d="M52 68 H72 M52 100 H72" className="text-accent" {...ink} />
      <path d="M72 68 L62 62 M72 68 L62 74" className="text-accent" {...ink} />
      <path d="M72 100 L62 94 M72 100 L62 106" className="text-accent" {...ink} />
      <T x="40" y="88" accent>P</T>
      <path d="M86 128 V148 M278 128 V148 M86 148 H278" {...dim} />
      <T x="182" y="164">L</T>
      <path d="M72 44 H292" {...dim} />
      <path d="M72 38 V50 M292 38 V50" {...dim} />
      <T x="182" y="36">D</T>
      <path d="M350 78 V90" {...dim} />
      <T x="366" y="88">d</T>
    </Plate>
  );
}

export function TankSketch() {
  return (
    <Plate label="Open tank, liquid column">
      <path d="M140 36 V132 H300 V36" {...ink} />
      <path d="M142 78 H298" className="text-accent" {...ink} />
      <path d="M312 78 V132" {...dim} />
      <T x="326" y="110">h</T>
      <T x="220" y="70" accent>ρ</T>
    </Plate>
  );
}

export function NpshSketch() {
  return (
    <Plate label="Open tank, suction line, and pump">
      <path d="M48 40 V140 H148 V40" {...ink} />
      <path d="M50 86 H146" className="text-accent" {...ink} />
      <path d="M148 118 H250" {...ink} />
      <circle cx="286" cy="118" r="26" {...ink} />
      <path d="M312 118 H390" {...ink} />
      <T x="78" y="32">tank</T>
      <T x="56" y="78" accent>Hs</T>
      <T x="188" y="108" accent>Hloss</T>
      <T x="286" y="122">pump</T>
    </Plate>
  );
}

export function ShaftSketch() {
  return (
    <Plate label="Circular shaft in torsion">
      <ellipse cx="120" cy="84" rx="18" ry="34" {...ink} />
      <path d="M120 50 H320" {...ink} />
      <path d="M120 118 H320" {...ink} />
      <ellipse cx="320" cy="84" rx="18" ry="34" className="fill-surface" {...ink} />
      <path d="M320 50 Q348 84 320 118" className="text-accent" {...ink} />
      <T x="348" y="80" accent>T</T>
      <path d="M120 140 H320" {...dim} />
      <T x="220" y="156">L</T>
    </Plate>
  );
}

export function VesselSketch() {
  return (
    <Plate label="Closed thin-wall cylinder">
      <path d="M100 84 H340" {...ink} />
      <ellipse cx="100" cy="84" rx="28" ry="48" {...ink} />
      <ellipse cx="340" cy="84" rx="28" ry="48" className="fill-surface" {...ink} />
      <path d="M100 36 H340" {...ink} />
      <path d="M100 132 H340" {...ink} />
      <T x="220" y="28" accent>p</T>
      <path d="M368 36 V132" {...dim} />
      <T x="384" y="88">D</T>
    </Plate>
  );
}

export function TriangleSketch() {
  return (
    <Plate label="Right triangle">
      <path d="M120 128 L320 128 L120 48 Z" {...ink} />
      <path d="M120 112 H136 V128" {...ink} />
      <T x="220" y="148">a</T>
      <T x="108" y="92">b</T>
      <T x="232" y="80">c</T>
    </Plate>
  );
}

export function ContinuitySketch() {
  return (
    <Plate label="Two flow sections">
      <path d="M48 50 L180 50 L260 70 H392 V98 H260 L180 118 H48 Z" {...ink} />
      <T x="110" y="40">A₁ v₁</T>
      <T x="330" y="62">A₂ v₂</T>
      <T x="220" y="148" accent>Q</T>
    </Plate>
  );
}

export function OhmSketch() {
  return (
    <Plate label="DC source and one resistor">
      <path d="M80 84 H150" {...ink} />
      <circle cx="80" cy="84" r="16" {...ink} />
      <T x="80" y="88">V</T>
      <path d="M150 84 H190 L198 68 L214 100 L230 68 L246 100 L254 84 H300" {...ink} />
      <path d="M300 84 H360" {...ink} />
      <T x="220" y="128">R</T>
      <T x="120" y="72" accent>I</T>
    </Plate>
  );
}

export function SpringSketch() {
  return (
    <Plate label="Close-coiled compression spring">
      <path d="M80 84 H120 M320 84 H360" {...ink} />
      <path d="M120 84 L140 52 L160 116 L180 52 L200 116 L220 52 L240 116 L260 52 L280 116 L300 52 L320 84" {...ink} />
      <path d="M80 84 L68 74 M80 84 L68 94" className="text-accent" {...ink} />
      <T x="52" y="88" accent>F</T>
      <T x="220" y="148">D · d · Na</T>
    </Plate>
  );
}

export function GearSketch() {
  return (
    <Plate label="Gear pair">
      <circle cx="160" cy="84" r="48" {...ink} />
      <circle cx="160" cy="84" r="8" {...ink} />
      <circle cx="286" cy="84" r="32" {...ink} />
      <circle cx="286" cy="84" r="8" {...ink} />
      <T x="160" y="156">z₁</T>
      <T x="286" y="156">z₂</T>
    </Plate>
  );
}

export function PipeSketch() {
  return (
    <Plate label="Straight pipe, Darcy loss">
      <path d="M48 70 H392" {...ink} />
      <path d="M48 98 H392" {...ink} />
      <path d="M48 70 V98 M392 70 V98" {...ink} />
      <path d="M80 54 H360" {...dim} />
      <T x="220" y="48">L</T>
      <path d="M48 114 V140 M48 140 H80" {...dim} />
      <T x="64" y="156">D</T>
      <T x="220" y="88" accent>Q</T>
    </Plate>
  );
}

export function BoltSketch() {
  return (
    <Plate label="Single bolt in tension">
      <rect x="200" y="28" width="40" height="18" {...ink} />
      <path d="M208 46 V128 M232 46 V128" {...ink} />
      <path d="M200 128 H240 L220 148 Z" {...ink} />
      <path d="M220 28 V12" className="text-accent" {...ink} />
      <path d="M220 12 L212 22 M220 12 L228 22" className="text-accent" {...ink} />
      <T x="238" y="18" accent>Ft</T>
      <T x="252" y="90">d</T>
    </Plate>
  );
}

export function SectionSketch({ shape }: { shape?: string }) {
  if (shape === "circle") {
    return (
      <Plate label="Solid circular section">
        <circle cx="220" cy="84" r="48" {...ink} />
        <path d="M172 84 H268" {...dim} />
        <T x="220" y="148">D</T>
      </Plate>
    );
  }
  if (shape === "annulus") {
    return (
      <Plate label="Circular tube">
        <circle cx="220" cy="84" r="48" {...ink} />
        <circle cx="220" cy="84" r="28" {...ink} />
        <T x="220" y="148">D · d</T>
      </Plate>
    );
  }
  return (
    <Plate label="Rectangular section">
      <rect x="160" y="40" width="120" height="88" className="fill-surface" {...ink} />
      <path d="M160 140 H280" {...dim} />
      <T x="220" y="156">b</T>
      <path d="M300 40 V128" {...dim} />
      <T x="314" y="88">h</T>
    </Plate>
  );
}

export function LmtdSketch() {
  return (
    <Plate label="Two fluid streams, terminal temperatures">
      <path d="M60 56 H380" className="text-accent" {...ink} />
      <path d="M60 112 H380" {...ink} />
      <T x="80" y="48" accent>Th,in</T>
      <T x="360" y="48" accent>Th,out</T>
      <T x="80" y="140">Tc,in</T>
      <T x="360" y="140">Tc,out</T>
    </Plate>
  );
}

export function RelationPlate({ toolId }: { toolId: ToolId }) {
  const tool = getTool(toolId);
  return (
    <Plate label={tool?.title ?? "Declared relation"}>
      <rect x="48" y="36" width="344" height="96" rx="4" className="fill-surface" {...ink} />
      <T x="220" y="74">{tool?.outputLabel ?? "result"}</T>
      <T x="220" y="102">{tool?.title ?? toolId}</T>
    </Plate>
  );
}

export function ToolSketch({ toolId, variant }: { toolId: ToolId; variant?: string }) {
  switch (toolId) {
    case "axial":
      return <AxialSketch />;
    case "beam":
      return <BeamSketch cantilever={variant === "cantilever"} />;
    case "beamDiagram":
      return <BeamDiagramSketch />;
    case "stability":
      return <ColumnSketch />;
    case "section":
      return <SectionSketch shape={variant} />;
    case "cylinder":
      return <CylinderSketch />;
    case "triangle":
      return <TriangleSketch />;
    case "pneumatic":
    case "airConsumption":
    case "pneumaticCycleTime":
      return <ActuatorSketch family="air" />;
    case "hydraulicCylinder":
      return <ActuatorSketch family="oil" />;
    case "hydrostatic":
    case "buoyancyForce":
      return <TankSketch />;
    case "npshAvailableBudget":
      return <NpshSketch />;
    case "torsion":
    case "couplingTorsion":
      return <ShaftSketch />;
    case "thinVessel":
    case "vesselGeometry":
      return <VesselSketch />;
    case "continuity":
      return <ContinuitySketch />;
    case "ohm":
      return <OhmSketch />;
    case "compressionSpring":
    case "extensionSpring":
    case "torsionSpring":
      return <SpringSketch />;
    case "gearRatio":
    case "gearMeshForce":
    case "planetaryGear":
      return <GearSketch />;
    case "darcy":
    case "darcyFrictionFactor":
    case "pipeSizing":
    case "hydraulicLine":
      return <PipeSketch />;
    case "boltPreload":
    case "boltLoad":
    case "threadTensileArea":
      return <BoltSketch />;
    case "lmtd":
      return <LmtdSketch />;
    default:
      return <RelationPlate toolId={toolId} />;
  }
}
