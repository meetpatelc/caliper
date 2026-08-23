/** Models that have a real member drawing. No drawing → no band, no placeholder. */
const DEDICATED = new Set([
  "axial",
  "beam",
  "beamDiagram",
  "stability",
  "section",
  "cylinder",
  "triangle",
  "pneumatic",
  "airConsumption",
  "pneumaticCycleTime",
  "hydraulicCylinder",
  "hydrostatic",
  "buoyancyForce",
  "npshAvailableBudget",
  "torsion",
  "couplingTorsion",
  "thinVessel",
  "vesselGeometry",
  "continuity",
  "ohm",
  "compressionSpring",
  "extensionSpring",
  "torsionSpring",
  "gearRatio",
  "gearMeshForce",
  "planetaryGear",
  "darcy",
  "darcyFrictionFactor",
  "pipeSizing",
  "hydraulicLine",
  "boltPreload",
  "boltLoad",
  "threadTensileArea",
  "lmtd",
]);

const ALIAS: Record<string, string> = {
  "metric-bolt-area": "boltPreload",
};

export function resolveSketchId(slug: string, sketch?: string) {
  const candidate = sketch || ALIAS[slug] || slug;
  return DEDICATED.has(candidate) ? candidate : undefined;
}
