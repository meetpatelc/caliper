// @ts-nocheck
/**
 * Closed-form truth checks.
 *
 * The `*.golden.json` suites pin each model against ITS OWN output at
 * capture time. That catches drift, which is what they are for — but it cannot
 * catch a formula that was wrong when captured, because the wrong value becomes
 * the expectation and the suite reports green forever.
 *
 * These cases are different in kind: every expected value is recomputed here
 * from the governing relation, written out independently of the implementation
 * and named to its source. If someone changes an expression, this fails and
 * cannot be fixed by re-baselining a golden file.
 *
 * Comparison is on the CANONICAL SI value (`raw`), not the formatted display
 * string, so it tests the arithmetic rather than the rounding.
 *
 * Adding a model here is the strongest check available: state the relation,
 * compute it independently, cite where it comes from.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateTool, initialInputs } from "./engineering.ts";

/** Standard gravity, the value the app's unit inventory uses. */
const G = 9.80665;

/** Relative tolerance — these are closed forms, so they should agree closely. */
const REL_TOL = 1e-9;

/**
 * Each case: the model id, the source the relation comes from, and a function
 * returning expected canonical values. Inputs are restated locally in SI so the
 * expectation never reads anything out of the implementation.
 */
const CASES = [
  {
    id: "axial",
    source: "σ = F/A · ε = σ/E · ΔL = εL (mechanics of materials, axial member)",
    expected() {
      const F = 10e3; // 10 kN
      const A = 1000e-6; // 1000 mm²
      const L = 1.0; // 1000 mm
      const E = 200e9; // 200 GPa
      const stress = F / A;
      const strain = stress / E;
      return { stress, strain, extension: strain * L };
    },
  },
  {
    id: "thinVessel",
    source: "σhoop = pD/2t · σlong = pD/4t (closed thin-walled cylinder, membrane stress)",
    expected() {
      const p = 1.2e6; // 1.2 MPa
      const D = 0.6; // 600 mm
      const t = 0.012; // 12 mm
      return {
        hoop: (p * D) / (2 * t),
        longitudinal: (p * D) / (4 * t),
        diameterThickness: D / t,
      };
    },
  },
  {
    id: "boltPreload",
    source: "F = T/(K·d), ± declared uncertainty (nut-factor torque–preload relation)",
    expected() {
      const T = 80; // N·m
      const d = 0.012; // 12 mm
      const K = 0.2;
      const u = 0.25;
      const preload = T / (K * d);
      return { preload, lower: preload * (1 - u), upper: preload * (1 + u) };
    },
  },
  {
    id: "stability",
    source: "Pcr = π²EI/(KL)² (Euler critical load, pinned-pinned K = 1)",
    expected() {
      const E = 200e9; // GPa
      const I = 25e-8; // 25 cm⁴ in m⁴
      const K = 1;
      const L = 1.5; // m
      return {
        effectiveLength: K * L,
        criticalLoad: (Math.PI ** 2 * E * I) / (K * L) ** 2,
      };
    },
  },
  {
    id: "goodmanFatigue",
    source: "σ = Kf·σnom · U = σa/Sn + σm/Su (modified Goodman line)",
    expected() {
      const Kf = 1.6;
      const alternating = 80;
      const mean = 60;
      const Sn = 180;
      const Su = 600;
      const adjustedAlternating = Kf * alternating;
      const adjustedMean = Kf * mean;
      return {
        adjustedAlternating,
        adjustedMean,
        utilization: adjustedAlternating / Sn + adjustedMean / Su,
      };
    },
  },
  {
    id: "keyway",
    source: "Ft = 2T/D · τ = Ft/(wL) · σb = Ft/((h/2)L) (parallel key, direct stress)",
    expected() {
      const T = 200; // N·m
      const D = 0.04; // 40 mm
      const w = 0.012; // 12 mm
      const h = 0.008; // 8 mm
      const L = 0.05; // 50 mm
      const tangentialForce = (2 * T) / D;
      return {
        tangentialForce,
        shearStress: tangentialForce / (w * L),
        bearingStress: tangentialForce / ((h / 2) * L),
      };
    },
  },
  {
    id: "hertzContact",
    source: "1/E* = Σ(1−ν²)/E · a = [3FR/(4E*)]^⅓ · p₀ = 3F/(2πa²) · δ = a²/R (Hertz, sphere on flat)",
    expected() {
      const F = 500; // N
      const R = 0.012; // 12 mm
      const E1 = 210e9;
      const v1 = 0.3;
      const E2 = 70e9;
      const v2 = 0.33;
      const reducedModulus = 1 / ((1 - v1 ** 2) / E1 + (1 - v2 ** 2) / E2);
      const contactRadius = Math.cbrt((3 * F * R) / (4 * reducedModulus));
      return {
        reducedModulus,
        contactRadius,
        contactDiameter: 2 * contactRadius,
        peakPressure: (3 * F) / (2 * Math.PI * contactRadius ** 2),
        indentation: contactRadius ** 2 / R,
      };
    },
  },
  {
    id: "fractureIntensity",
    source: "KI = Yσ√(πa) (linear-elastic fracture mechanics, Mode I)",
    expected() {
      const Y = 1.12;
      const sigma = 100; // MPa
      const a = 0.005; // 5 mm
      const Kic = 50; // MPa√m
      const stressIntensity = Y * sigma * Math.sqrt(Math.PI * a);
      return {
        stressIntensity,
        toughnessRatio: stressIntensity / Kic,
        arithmeticDifference: Kic - stressIntensity,
      };
    },
  },
  {
    id: "reynoldsNumber",
    source: "Re = ρuD/μ · ν = μ/ρ (pipe flow)",
    expected() {
      const rho = 1000;
      const u = 1.5;
      const D = 0.02;
      const mu = 0.001;
      return {
        reynolds: (rho * u * D) / mu,
        kinematicViscosity: mu / rho,
        thresholdRatio: (rho * u * D) / mu / 2300,
      };
    },
  },
  {
    id: "darcy",
    source: "Δp = f(L/D)(ρv²/2) · hL = Δp/(ρg) (Darcy–Weisbach)",
    expected() {
      const f = 0.02;
      const L = 25;
      const D = 0.05;
      const rho = 1000;
      const v = 1.8;
      const dynamicPressure = (rho * v ** 2) / 2;
      const pressureLoss = f * (L / D) * dynamicPressure;
      return { pressureLoss, headLoss: pressureLoss / (rho * G), dynamicPressure };
    },
  },
  {
    id: "planeConduction",
    source: "Q̇ = kAΔT/L · R = L/(kA) (Fourier, plane wall)",
    expected() {
      const k = 0.8;
      const A = 2.5;
      const L = 0.12; // 120 mm
      const dT = 80 - 20;
      const heatRate = (k * A * dT) / L;
      return { heatRate, resistance: L / (k * A), heatFlux: heatRate / A };
    },
  },
  {
    id: "bearingLife",
    source: "L10 = (C/P)³ · hours = L10·10⁶/(60n) (ISO 281 basic rating life, ball p = 3)",
    expected() {
      const C = 19.5;
      const P = 4.8;
      const n = 1450;
      const millionRevolutions = (C / P) ** 3;
      return {
        millionRevolutions,
        hours: (millionRevolutions * 1e6) / (60 * n),
        loadRatio: C / P,
      };
    },
  },
  {
    id: "leadScrew",
    source: "T = Fl/(2πη) · v = ln/60 · P = Fv (power screw, declared efficiency)",
    expected() {
      const F = 4000; // 4 kN
      const l = 0.01; // 10 mm lead
      const eta = 0.82;
      const n = 600; // rpm
      const speed = (l * n) / 60;
      return {
        torque: (F * l) / (2 * Math.PI * eta),
        speed,
        power: F * speed,
      };
    },
  },
  {
    id: "sensibleHeat",
    source: "Q = mcΔT (sensible heat)",
    expected() {
      const m = 10;
      const c = 4.186e3; // kJ/kg·K → J/kg·K
      const dT = 25;
      const heat = m * c * dT;
      return { heat, heatJ: heat, specificEnergy: heat / m / 1000 };
    },
  },
  {
    id: "ohm",
    source: "I = V/R · P = VI (Ohm / Joule)",
    expected() {
      const V = 24;
      const R = 12;
      const current = V / R;
      return { current, power: V * current, powerMilli: V * current * 1000 };
    },
  },
  {
    id: "kinetic",
    source: "KE = ½mv² · p = mv (translational kinetics)",
    expected() {
      const m = 1000;
      const v = 20;
      const energy = 0.5 * m * v ** 2;
      return { energy, energyJ: energy, momentum: m * v };
    },
  },
  {
    id: "hydrostatic",
    source: "p = ρgh (hydrostatic gauge pressure)",
    expected() {
      return { pressure: 1000 * G * 2.5 };
    },
  },
  {
    id: "newton",
    source: "F = ma (Newton's second law)",
    expected() {
      const m = 10;
      const a = 2.5;
      return { force: m * a, forceKilo: m * a, accelerationG: a };
    },
  },
  {
    id: "torsion",
    source: "J = πD⁴/32 · τ = Tc/J · φ = TL/(GJ) · P = Tω (circular shaft in torsion)",
    expected() {
      const T = 250; // N·m
      const D = 0.035; // 35 mm
      const L = 0.8; // 800 mm
      const G = 79e9; // 79 GPa
      const rpm = 1450;
      const polarMoment = (Math.PI * D ** 4) / 32;
      return {
        polarMoment,
        shearStress: (T * (D / 2)) / polarMoment,
        // `twistDeg` is displayed in degrees; the canonical value is radians.
        twistDeg: (T * L) / (G * polarMoment),
        power: T * ((2 * Math.PI * rpm) / 60),
      };
    },
  },
  {
    id: "bernoulli",
    source: "p₁ + ½ρv₁² + ρgz₁ = p₂ + ½ρv₂² + ρgz₂ (steady incompressible Bernoulli)",
    expected() {
      const rho = 1000;
      const v1 = 1.5;
      const v2 = 3.0;
      // Equal elevations, so the whole change is the velocity head.
      const pressureChange = 0.5 * rho * (v1 ** 2 - v2 ** 2);
      const headChange = pressureChange / (rho * G);
      return { pressureChange, headChange, velocityHeadChange: headChange };
    },
  },
  {
    id: "continuity",
    source: "Q = A₁v₁ = A₂v₂ (incompressible continuity)",
    expected() {
      const a1 = 1000e-6; // 1000 mm²
      const v1 = 2;
      const a2 = 400e-6; // 400 mm²
      const flow = a1 * v1;
      return { flow, velocity2: flow / a2, areaRatio: a1 / a2 };
    },
  },
  {
    id: "thermalExpansion",
    source: "ΔL = αL₀ΔT · εth = αΔT (linear thermal expansion)",
    expected() {
      const L0 = 1.2; // 1200 mm
      const alpha = 12e-6; // per K
      const dT = 65;
      const extension = alpha * L0 * dT;
      return { extension, finalLength: L0 + extension, thermalStrain: alpha * dT };
    },
  },
  {
    id: "gravitationalPe",
    source: "PE = mgh (gravitational potential energy)",
    expected() {
      return { energy: 80 * G * 2 };
    },
  },
  {
    id: "pipeVelocity",
    source: "V = 4Q/(πD²) (mean velocity in a round pipe)",
    expected() {
      const Q = 8e-3; // 8 L/s
      const D = 0.08; // 80 mm
      return { speed: (4 * Q) / (Math.PI * D ** 2) };
    },
  },
  {
    id: "dynamicPressure",
    source: "q = ½ρV² (dynamic pressure)",
    expected() {
      return { q: 0.5 * 1.225 * 20 ** 2 };
    },
  },
];

for (const { id, source, expected } of CASES) {
  test(`${id}: matches the closed form — ${source}`, () => {
    const result = calculateTool(id, initialInputs[id]);
    assert.deepEqual(result.errors, [], `${id} produced errors`);

    const byKey = new Map(result.values.map((value) => [value.key, value.raw]));
    for (const [key, want] of Object.entries(expected())) {
      assert.ok(byKey.has(key), `${id}: no output named "${key}"`);
      const got = byKey.get(key);
      const tolerance = Math.abs(want) * REL_TOL;
      assert.ok(
        Math.abs(got - want) <= tolerance,
        `${id}.${key}: implementation ${got} vs closed form ${want} ` +
          `(difference ${Math.abs(got - want)} exceeds ${tolerance})`,
      );
    }
  });
}

test("every checked model is a released catalog entry", async () => {
  // A case naming a model that no longer exists would otherwise pass silently
  // once `calculateTool` stopped recognising the id.
  const { tools } = await import("./catalog.ts");
  const released = new Set(tools.map((tool) => tool.id));
  for (const { id } of CASES) {
    assert.ok(released.has(id), `${id} is checked here but not in the catalog`);
  }
});
