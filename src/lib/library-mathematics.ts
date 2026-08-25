import type { InstrumentDocument } from "@/lib/document";
import { libraryDoc } from "@/lib/library-doc";

/** Geometry and mathematics models. Catalog owns the prose; each entry owns its fields, expressions and warnings. */
export const mathematicsDocuments: Record<string, InstrumentDocument> = {
  circularArc: libraryDoc("circularArc", {
    fields: [
      { id: "radius", label: "Radius", symbol: "r", help: "Nominal planar circle radius.", defaultValue: 75, defaultUnit: "mm" },
      { id: "angle", label: "Central angle", symbol: "θ", help: "Angle subtended by the arc from greater than 0 through 360 degrees.", defaultValue: 120, defaultUnit: "°" },
    ],
    outputs: [
      { id: "arc", label: "Arc length", defaultUnit: "mm", expression: "radius*angle*pi/180" },
      { id: "chord", label: "Chord length", defaultUnit: "mm", expression: "2*radius*sin(angle*pi/360)" },
      { id: "sector", label: "Sector area", defaultUnit: "mm²", expression: "radius^2*(angle*pi/180)/2" },
      { id: "segment", label: "Circular-segment area", defaultUnit: "mm²", expression: "radius^2*(angle*pi/180)/2-radius^2*sin(angle*pi/180)/2" },
    ],
    formula: "s = rθ · c = 2r sin(θ/2) · Asector = r²θ/2 · Asegment = Asector − r²sinθ/2",
    warnings: ["This is nominal planar-circle geometry. It excludes manufacturing tolerances, three-dimensional curvature, material thickness, bend allowance, forming response, and any manufacturing or inspection decision."],
  }),
  coordinate: libraryDoc("coordinate", {
    fields: [
      { id: "x1", label: "Point A · x", symbol: "x₁", help: "First point, x coordinate.", family: "length", defaultValue: 0, defaultUnit: "mm", signed: true },
      { id: "y1", label: "Point A · y", symbol: "y₁", help: "First point, y coordinate.", family: "length", defaultValue: 0, defaultUnit: "mm", signed: true },
      { id: "z1", label: "Point A · z", symbol: "z₁", help: "First point, z coordinate.", family: "length", defaultValue: 0, defaultUnit: "mm", signed: true },
      { id: "x2", label: "Point B · x", symbol: "x₂", help: "Second point, x coordinate.", family: "length", defaultValue: 300, defaultUnit: "mm", signed: true },
      { id: "y2", label: "Point B · y", symbol: "y₂", help: "Second point, y coordinate.", family: "length", defaultValue: 400, defaultUnit: "mm", signed: true },
      { id: "z2", label: "Point B · z", symbol: "z₂", help: "Second point, z coordinate.", family: "length", defaultValue: 120, defaultUnit: "mm", signed: true }
    ],
    outputs: [
      { id: "dx", label: "x displacement", family: "length", defaultUnit: "mm", expression: "((x2/0.001)-(x1/0.001))*0.001" },
      { id: "dy", label: "y displacement", family: "length", defaultUnit: "mm", expression: "((y2/0.001)-(y1/0.001))*0.001" },
      { id: "dz", label: "z displacement", family: "length", defaultUnit: "mm", expression: "((z2/0.001)-(z1/0.001))*0.001" },
      { id: "span", label: "Straight-line span", family: "length", defaultUnit: "mm", expression: "(sqrt(((x2/0.001)-(x1/0.001))^2+((y2/0.001)-(y1/0.001))^2+((z2/0.001)-(z1/0.001))^2))*0.001" }
    ],
    formula: "d = √[(x₂−x₁)² + (y₂−y₁)² + (z₂−z₁)²]",
    warnings: ["Coordinates must share one origin, axis convention, and unit. The result is a straight-line geometric span, not a routed path or a tolerance analysis."],
  }),
  cylinder: libraryDoc("cylinder", {
    fields: [
      { id: "diameter", label: "Diameter", symbol: "D", help: "Nominal outside diameter of a right circular cylinder.", family: "length", defaultValue: 100, defaultUnit: "mm" },
      { id: "length", label: "Cylinder length", symbol: "L", help: "Axial length of the displayed cylinder.", family: "length", defaultValue: 500, defaultUnit: "mm" }
    ],
    outputs: [
      { id: "volume", label: "Cylinder volume", family: "volume", defaultUnit: "L", expression: "(pi*((diameter/0.001)/2)^2*(length/0.001)/1e6)*0.001" },
      { id: "endArea", label: "End area", family: "area", defaultUnit: "mm²", expression: "(pi*((diameter/0.001)/2)^2)*0.000001" },
      { id: "lateralArea", label: "Lateral surface", family: "area", defaultUnit: "mm²", expression: "(pi*(diameter/0.001)*(length/0.001))*0.000001" },
      { id: "totalSurface", label: "Total outer surface", family: "area", defaultUnit: "mm²", expression: "(pi*(diameter/0.001)*(length/0.001)+2*pi*((diameter/0.001)/2)^2)*0.000001" }
    ],
    formula: "V = π(D/2)²L · Aend = π(D/2)² · Alateral = πDL",
    warnings: ["This is nominal closed-cylinder geometry. Wall thickness, end shape, internal fittings, deformation, and manufacturing tolerances are outside the model."],
  }),
  pitchCircle: libraryDoc("pitchCircle", {
    fields: [
      { id: "pcd", label: "Pitch-circle diameter", symbol: "PCD", help: "Nominal diameter through equal-spacing hole centers.", defaultValue: 100, defaultUnit: "mm" },
      { id: "holeCount", label: "Equal hole count", symbol: "n", help: "Integer count of equally spaced nominal hole centers.", defaultValue: 6, defaultUnit: "holes" },
      { id: "startAngle", label: "First-hole angle", symbol: "θ₀", help: "Angle of the first center from the positive X-axis in the displayed nominal coordinate frame.", defaultValue: 0, defaultUnit: "deg", signed: true },
    ],
    outputs: [
      { id: "radius", label: "Pitch-circle radius", defaultUnit: "mm", expression: "((pcd)/2)" },
      { id: "angularPitch", label: "Equal angular pitch", defaultUnit: "°", expression: "(360/(holeCount))" },
      { id: "adjacentChord", label: "Adjacent-center chord", defaultUnit: "mm", expression: "(2*((pcd)/2)*sin(pi/(holeCount)))" },
      { id: "firstX", label: "First-hole nominal X", defaultUnit: "mm", expression: "(((pcd)/2)*cos((startAngle)*pi/180))" },
      { id: "firstY", label: "First-hole nominal Y", defaultUnit: "mm", expression: "(((pcd)/2)*sin((startAngle)*pi/180))" },
      { id: "oppositeX", label: "180° opposite nominal X", defaultUnit: "mm", expression: "(((pcd)/2)*cos(((startAngle)+180)*pi/180))" },
      { id: "oppositeY", label: "180° opposite nominal Y", defaultUnit: "mm", expression: "(((pcd)/2)*sin(((startAngle)+180)*pi/180))" },
    ],
    formula: "r = PCD/2 · Δθ = 360°/n · chord = 2r sin(π/n) · xi = r cos(θ₀+iΔθ) · yi = r sin(θ₀+iΔθ)",
    warnings: ["This is equal-spacing nominal pitch-circle geometry only. It does not create CAD/CAM/G-code, select fasteners, calculate hole diameter or tolerance, interpret GD&T, establish datum references, assess positional accuracy, balance rotating components, determine manufacturability, or approve a drawing or part."],
  }),
  regularPolygon: libraryDoc("regularPolygon", {
    fields: [
      { id: "sideCount", label: "Side count", symbol: "n", help: "Integer count for a regular convex polygon, at least 3.", defaultValue: 6, defaultUnit: "sides" },
      { id: "sideLength", label: "Side length", symbol: "s", help: "Nominal equal side length of the regular polygon.", defaultValue: 20, defaultUnit: "mm" },
    ],
    outputs: [
      { id: "perimeter", label: "Perimeter", defaultUnit: "mm", expression: "((sideCount)*(sideLength))" },
      { id: "apothem", label: "Apothem", defaultUnit: "mm", expression: "((sideLength)/(2*tan((pi/(sideCount)))))" },
      { id: "circumradius", label: "Circumradius", defaultUnit: "mm", expression: "((sideLength)/(2*sin((pi/(sideCount)))))" },
      { id: "interiorAngle", label: "Each interior angle", defaultUnit: "°", expression: "(((sideCount)-2)*180/(sideCount))" },
      { id: "area", label: "Regular-polygon area", defaultUnit: "mm²", expression: "(0.5*((sideLength)/(2*tan((pi/(sideCount)))))*((sideCount)*(sideLength)))" },
    ],
    formula: "P = ns · a = s/[2 tan(π/n)] · R = s/[2 sin(π/n)] · α = (n−2)180°/n · A = aP/2",
    warnings: ["This is planar regular-polygon closed-form geometry: every side and every interior angle are assumed equal. It does not calculate irregular polygons, tolerance zones, CAD/CAM geometry, feature position, material area allowance, manufacturability, structural response, or drawing compliance."],
  }),
  triangle: libraryDoc("triangle", {
    fields: [
      { id: "legA", label: "Horizontal leg", symbol: "a", help: "One perpendicular leg of the displayed right triangle.", defaultValue: 300, defaultUnit: "mm" },
      { id: "legB", label: "Vertical leg", symbol: "b", help: "The second perpendicular leg of the displayed triangle.", defaultValue: 400, defaultUnit: "mm" },
    ],
    outputs: [
      { id: "hypotenuse", label: "Hypotenuse", defaultUnit: "mm", expression: "hypot(legA, legB)" },
      { id: "area", label: "Triangle area", defaultUnit: "mm²", expression: "legA*legB/2" },
      { id: "alpha", label: "Angle from horizontal", defaultUnit: "°", expression: "atan2(legB, legA)*180/pi" },
      { id: "beta", label: "Other acute angle", defaultUnit: "°", expression: "90-atan2(legB, legA)*180/pi" },
    ],
    formula: "c = √(a² + b²) · A = ab / 2 · α = tan⁻¹(b/a)",
    warnings: ["This uses a flat Euclidean right triangle. It does not infer dimensions from a drawing, field measurement, tolerance, or a non-perpendicular geometry."],
  }),
};
