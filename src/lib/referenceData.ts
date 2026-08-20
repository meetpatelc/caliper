/**
 * Engineering Desk — governed reference registry.
 * These records are a discoverable provenance surface, not a component selector.
 * Values are carried only where the cited authority defines an exact public value.
 */

export type ReferenceValue = {
  label: string;
  value: string;
  unit: string;
  note: string;
};

export type ReferenceDataset = {
  id: "constants" | "materials" | "material-304-nist" | "datum-reference-frame-nist" | "surface-texture" | "hardness" | "standards" | "general-tolerances" | "vfd-compatibility" | "sensor-requirements" | "spring-fatigue" | "tool-life";
  title: string;
  version: string;
  sourceLabel: string;
  sourceUrl: string;
  access: string;
  coverage: string;
  range: string;
  region: string;
  updatePolicy: string;
  boundary: string;
  values: ReferenceValue[];
};

export const governedReferenceData: ReferenceDataset[] = [
  {
    id: "tool-life",
    title: "Taylor tool-life evidence",
    version: "Zhang et al., Coatings 12 (2022) 1553 · reviewed 19 Aug 2026",
    sourceLabel: "Taylor-equation tool-life research context",
    sourceUrl: "https://www.mdpi.com/2079-6412/12/10/1553",
    access: "Open-access research article",
    coverage: "Evidence that Taylor’s relation is empirical and speed-dependent, with expanded models considering additional machining conditions.",
    range: "No constants, exponents, or life values are supplied; each model must retain matched experimental basis and stated conditions.",
    region: "Research context; process-specific",
    updatePolicy: "Record source test conditions, tool/workpiece pair, wear criterion, and validity range before applying any empirical tool-life relation.",
    boundary: "Not a tooling recommendation, cutting-data source, wear prediction, process-capability claim, or approval of a machining operation.",
    values: [{ label: "Required evidence", value: "matched test basis · wear criterion · speed range", unit: "—", note: "Do not transfer empirical constants outside declared source conditions." }],
  },
  {
    id: "constants",
    title: "Fundamental physical constants",
    version: "CODATA 2022 · NIST SRD 121 · content update May 2024",
    sourceLabel: "NIST Fundamental Physical Constants",
    sourceUrl: "https://physics.nist.gov/cuu/Constants/",
    access: "Public NIST reference",
    coverage: "Exact SI-defining constants retained for transparent calculation context.",
    range: "Only values shown below; consult NIST for the full adjustment, uncertainty, correlations, and later revisions.",
    region: "International CODATA / SI",
    updatePolicy: "Review the NIST edition link before every release that changes a constant-dependent method.",
    boundary: "Not a substitute for a complete scientific constants database or an uncertainty analysis.",
    values: [
      { label: "Speed of light in vacuum", value: "299 792 458", unit: "m/s", note: "Exact SI defining value." },
      { label: "Planck constant", value: "6.626 070 15 × 10⁻³⁴", unit: "J·s", note: "Exact SI defining value." },
      { label: "Elementary charge", value: "1.602 176 634 × 10⁻¹⁹", unit: "C", note: "Exact SI defining value." },
    ],
  },
  {
    id: "materials",
    title: "Condition-qualified material properties",
    version: "NIST source gateway · reviewed 18 Aug 2026",
    sourceLabel: "NIST Standard Reference Data",
    sourceUrl: "https://www.nist.gov/srd",
    access: "NIST public catalog; individual datasets may have separate access terms.",
    coverage: "Source discovery for material, thermal, mechanical, and fluid-property datasets.",
    range: "No generic material card is treated as a property lookup: alloy, product form, heat treatment, direction, temperature, and test method must be stated.",
    region: "NIST / dataset-specific",
    updatePolicy: "Record the exact database, material designation, condition, and retrieval date in the project calculation record.",
    boundary: "No component selection, allowable, design value, or material certification is generated here.",
    values: [
      { label: "Required record fields", value: "designation · condition · temperature", unit: "—", note: "Capture these before carrying a material property into a calculator." },
      { label: "Required evidence", value: "dataset · edition · retrieval date", unit: "—", note: "Keep a source trail with the project record." },
    ],
  },
  {
    id: "material-304-nist",
    title: "304 stainless cryogenic property record",
    version: "NIST 304 Stainless material-properties page · reviewed 20 Aug 2026",
    sourceLabel: "NIST Material Properties: 304 Stainless (UNS S30400)",
    sourceUrl: "https://trc.nist.gov/cryogenics/materials/304Stainless/304Stainless_rev.htm",
    access: "Public NIST cryogenic material-property reference page.",
    coverage: "Source-linked property-family, unit, range, and curve-fit context for NIST’s 304 stainless dataset.",
    range: "NIST lists thermal conductivity, specific heat, Young’s modulus, and linear expansion with property-specific data/equation ranges and curve-fit error context; consult the cited source before using any fitted value.",
    region: "NIST cryogenic dataset; UNS S30400 / source-specific temperature range.",
    updatePolicy: "Record the NIST source URL, material designation, property family, stated data/equation range, retrieval date, and any source-curve output in the project evidence record.",
    boundary: "No interpolation or extrapolation is performed; this is not a material-selection, condition-inference, allowable-value, design, certification, service-performance, fatigue/corrosion, safety, or approval result.",
    values: [
      { label: "Property families published", value: "thermal conductivity · specific heat · Young’s modulus · linear expansion", unit: "—", note: "NIST lists these families on the cited 304 stainless reference page." },
      { label: "Thermal-property range context", value: "4–300", unit: "K", note: "NIST page lists data and equation ranges by property; verify the applicable family and range before use." },
      { label: "Curve-fit context", value: "property-specific error stated", unit: "%", note: "The cited NIST page displays curve-fit error context; do not replace source-specific evaluation with this record." },
    ],
  },
  {
    id: "datum-reference-frame-nist",
    title: "Datum-reference-frame explanatory record",
    version: "NIST conceptual datum-system data model · reviewed 20 Aug 2026",
    sourceLabel: "NIST: A Conceptual Data Model of Datum Systems",
    sourceUrl: "https://nvlpubs.nist.gov/nistpubs/jres/104/4/html/j44mac.htm?newwindow=true",
    access: "Public NIST research publication.",
    coverage: "Source-linked datum-system vocabulary, mutually perpendicular reference-frame concept, precedence context, and stated material-condition terminology.",
    range: "Conceptual datum-system context only; the cited publication is not a controlled drawing standard, a feature-control-frame parser, or an inspection instruction.",
    region: "NIST conceptual model / drawing- and standard-specific application.",
    updatePolicy: "Record the controlling drawing revision, governing GD&T standard and edition, stated datum order, material-condition symbols, inspection plan, and project-specific interpretation before any verification activity.",
    boundary: "No drawing interpretation, datum-feature inference, datum precedence selection, datum-shift calculation, gage creation, inspection instruction, conformance, acceptance, safety, suitability, or approval is generated here.",
    values: [
      { label: "Datum-reference-frame concept", value: "mutually perpendicular datum planes and axes", unit: "—", note: "NIST describes a datum reference frame as a framework of mutually perpendicular datum planes and axes." },
      { label: "Review evidence", value: "drawing revision · GD&T edition · datum order · material condition", unit: "—", note: "Treat the controlled drawing and governing standard as the project interpretation basis." },
      { label: "Explanatory posture", value: "source-linked terminology only", unit: "—", note: "No geometric interpretation or inspection decision is performed by this record." },
    ],
  },
  {
    id: "surface-texture",
    title: "Surface texture and finish",
    version: "NIST program gateway + ASME B46.1-2019 publication context · reviewed 19 Aug 2026",
    sourceLabel: "NIST Surface Texture program and ASME B46.1 publication context",
    sourceUrl: "https://www.asme.org/topics-resources/society-news/asme-news/discover-asme-b46-1-updates-and-its-impact-on-measuring-and-testing-surfaces",
    access: "Public NIST/ASME publication context; controlled standard text and any comparison tables are not reproduced.",
    coverage: "Parameter definition, instrument context, traceability, topography measurement practice, and evidence fields needed before a controlled finish comparison.",
    range: "Ra, Rz, Rt, waviness, and lay are not universally convertible; state parameter, filter/cutoff, evaluation length, instrument, material/process, drawing callout, and controlling standard before comparing values.",
    region: "International measurement practice / standard-specific",
    updatePolicy: "Attach the controlling drawing or standard revision before using a roughness acceptance criterion.",
    boundary: "No generic Ra↔Rz conversion, surface equivalence, or surface acceptance decision is produced by this registry.",
    values: [
      { label: "Minimum comparison context", value: "parameter · filter · evaluation length", unit: "—", note: "Do not compare bare roughness numbers across unspecified measurement conditions." },
      { label: "Controlled comparison evidence", value: "drawing callout · standard edition · instrument/filter record · process/material", unit: "—", note: "ASME B46.1 frames parameter terminology and measurement context; use the controlled project basis rather than an online cross-scale table." },
    ],
  },
  {
    id: "hardness",
    title: "Hardness scales and conversion limits",
    version: "NIST hardness SRM gateway + ISO 18265:2013 publication record · reviewed 19 Aug 2026",
    sourceLabel: "NIST Hardness SRM and ISO 18265 conversion publication record",
    sourceUrl: "https://www.iso.org/standard/53810.html",
    access: "Public NIST/ISO publication context; controlled conversion tables and test methods are not reproduced.",
    coverage: "Hardness reference materials, method traceability, scale-specific measurement context, and controlled conversion-evidence requirements for metallic materials.",
    range: "ISO 18265:2013 sets conversion principles for metallic materials. Any conversion remains material-group, test-method, scale, range, indentation-geometry, and controlled-table edition specific.",
    region: "Test-method and standard-specific",
    updatePolicy: "Use the applicable controlled conversion table and record its edition, material class, and validity range with every conversion.",
    boundary: "This registry intentionally does not interpolate a universal Rockwell, Brinell, Vickers, or Knoop conversion, estimate tensile strength, or create a material acceptance decision.",
    values: [
      { label: "Required conversion context", value: "scale · material class · range · table edition", unit: "—", note: "A hardness number alone is insufficient for a defensible cross-scale conversion." },
      { label: "Controlled conversion evidence", value: "source scale/result · target scale · material group · controlled table/edition", unit: "—", note: "ISO 18265 publication context supports conversion principles for metallic materials; obtain the applicable controlled table before recording any project conversion." },
    ],
  },
  {
    id: "standards",
    title: "Standards applicability ledger",
    version: "Engineering Desk governance record v1.0 · reviewed 18 Aug 2026",
    sourceLabel: "NIST Standard Reference Data governance",
    sourceUrl: "https://www.nist.gov/srd",
    access: "Source links only; standards documents may be controlled by their publishers.",
    coverage: "ISO fits, GD&T, surface texture, hardness, fasteners, and process-quality methods referenced by workspace boundaries.",
    range: "Always verify jurisdiction, contract, product sector, edition, amendments, and project applicability.",
    region: "Project- and standard-specific",
    updatePolicy: "Record the controlling standard number, revision, and applicability decision in a project review record.",
    boundary: "This is not a reproduction of copyrighted standards or a compliance declaration.",
    values: [
      { label: "Required applicability check", value: "edition · jurisdiction · contract · product scope", unit: "—", note: "A cited standard name alone does not establish compliance." },
    ],
  },
  {
    id: "general-tolerances",
    title: "General tolerances applicability",
    version: "ISO 2768 edition 2 publication record · reviewed 18 Aug 2026",
    sourceLabel: "ISO 2768 publication record",
    sourceUrl: "https://www.iso.org/standard/85741.html",
    access: "Public ISO publication record; controlled standard text and tables are not reproduced.",
    coverage: "Applicability evidence for general linear and angular tolerancing where individual tolerances are not indicated.",
    range: "The ISO record states four tolerance classes and applicability to metal-removal or sheet-metal-formed workpieces; confirm the exact controlled edition, drawing callout, and manufacturing context.",
    region: "International ISO / drawing-specific",
    updatePolicy: "Confirm publication status, edition, drawing title block, and contract applicability before recording a tolerance basis.",
    boundary: "No ISO table values, class selection, drawing interpretation, inspection plan, or compliance conclusion is produced here.",
    values: [
      { label: "Required drawing evidence", value: "standard reference · class callout · drawing revision", unit: "—", note: "Record the stated title-block or note basis rather than inferring a class." },
      { label: "Required manufacturing context", value: "process · feature type · nominal size", unit: "—", note: "General-tolerance applicability must be checked against the actual feature and process." },
    ],
  },
  {
    id: "vfd-compatibility",
    title: "VFD and motor nameplate compatibility",
    version: "Danfoss VFD sizing guidance · 27 Sep 2016 · reviewed 18 Aug 2026",
    sourceLabel: "Danfoss: How do you size a VFD?",
    sourceUrl: "https://www.danfoss.com/en/about-danfoss/articles/dds/how-do-you-size-a-vfd/",
    access: "Public manufacturer application guidance.",
    coverage: "Evidence fields for motor current/voltage, drive input/output voltage, overload duty, supply phase, ambient, and altitude review.",
    range: "Danfoss frames sizing around motor current and voltage rather than horsepower alone; exact overload, derating, motor, and installation limits remain manufacturer- and application-specific.",
    region: "Manufacturer / installation-specific",
    updatePolicy: "Attach the motor nameplate, drive data sheet/manual, load profile, ambient, altitude, supply, and protection requirements to the project record.",
    boundary: "No VFD selection, derating calculation, programming value, harmonic study, cable analysis, braking selection, protection design, or safety/compliance approval is generated here.",
    values: [
      { label: "Motor evidence", value: "voltage · FLA · frequency · speed · duty", unit: "—", note: "Use the actual motor nameplate and its application condition." },
      { label: "Drive evidence", value: "input range · output current · overload class · enclosure", unit: "—", note: "Confirm these against the candidate drive’s current manual/data sheet." },
      { label: "Installation evidence", value: "supply · ambient · altitude · load profile", unit: "—", note: "Manufacturer-specific derating and application restrictions govern." },
    ],
  },
  {
    id: "sensor-requirements",
    title: "Inductive proximity-sensor requirements",
    version: "Eaton inductive proximity selection guide · reviewed 18 Aug 2026",
    sourceLabel: "Eaton: How to select an inductive proximity sensor",
    sourceUrl: "https://www.eaton.com/us/en-us/products/controls-drives-automation-sensors/sensors---limit-switches/inductive-proximity-sensor/how-to-select-an-inductive-proximity-sensor.html",
    access: "Public manufacturer selection guidance for inductive proximity sensing.",
    coverage: "Evidence fields for target material/distance/size, mounting, operating voltage, output, actuation rate, wiring, and configuration.",
    range: "The cited guide is specific to inductive proximity sensors; sensing range varies with target material and the stated mounting/environment constraints.",
    region: "Manufacturer / sensor-type-specific",
    updatePolicy: "Record sensing task, target, mounting, environment, electrical interface, response rate, and the candidate data sheet before product review.",
    boundary: "No sensor type or product selection, sensing-range correction, safety-function assessment, wiring design, environmental approval, or installation acceptance is generated here.",
    values: [
      { label: "Target evidence", value: "material · size · distance · motion rate", unit: "—", note: "The guide notes target material affects inductive sensing range." },
      { label: "Mounting evidence", value: "space · metal surround · flush/non-flush", unit: "—", note: "Mounting geometry changes applicable sensor configurations." },
      { label: "Electrical evidence", value: "supply · output · wiring · controller input", unit: "—", note: "Confirm compatibility from the candidate’s controlled data sheet." },
    ],
  },
  {
    id: "spring-fatigue",
    title: "Spring fatigue evidence ledger",
    version: "Lesjöfors spring-fatigue technical note · 11 Dec 2025 · reviewed 18 Aug 2026",
    sourceLabel: "Lesjöfors: Shot peening and spring fatigue",
    sourceUrl: "https://www.lesjofors.com/en/technology/insights/shot-peening-fatigue-improvement/",
    access: "Public manufacturer technical note; application data remains supplier/test specific.",
    coverage: "Evidence fields for material, process, surface condition, cyclic load, treatment, and validation test records in spring-fatigue review.",
    range: "The cited note describes surface treatment and test context; fatigue outcome depends on material, geometry, process control, loading, environment, and validation.",
    region: "Manufacturer / material / process-specific",
    updatePolicy: "Attach material certification, spring drawing, process route, treatment specification, load history, environment, and controlled fatigue-test evidence to the project record.",
    boundary: "No fatigue-life prediction, endurance limit, treatment prescription, spring selection, safety factor, or design approval is generated here.",
    values: [
      { label: "Material/process evidence", value: "material · heat treatment · wire/geometry · surface condition", unit: "—", note: "Do not carry a fatigue property without traceable condition context." },
      { label: "Cyclic-duty evidence", value: "load range · mean load · cycles · environment", unit: "—", note: "Use controlled test or validated manufacturer data for the actual duty." },
      { label: "Treatment/validation evidence", value: "process spec · coverage · residual stress/test record", unit: "—", note: "Treatment effects must be verified to the applicable process and part." },
    ],
  },
];

export const referenceDatasetById = (id: ReferenceDataset["id"]) => governedReferenceData.find((dataset) => dataset.id === id);
