import type { InstrumentDocument } from "@/lib/document";
import { libraryDoc } from "@/lib/library-doc";

/** GD&T, metrology and quality models. Catalog owns the prose; each entry owns its fields, expressions and warnings. */
export const qualityDocuments: Record<string, InstrumentDocument> = {
  formControl: libraryDoc("formControl", {
    fields: [
      { id: "formType", label: "Declared form control", help: "Choose the form category represented by the user-entered measurement record.", defaultValue: 0, defaultUnit: "—", choice: ["flatness", "straightness", "circularity", "cylindricity"] },
      { id: "measuredMinimum", label: "Measured minimum", symbol: "xmin", help: "Minimum value from the declared measurement record and setup.", defaultValue: -0.018, defaultUnit: "mm", signed: true },
      { id: "measuredMaximum", label: "Measured maximum", symbol: "xmax", help: "Maximum value from the declared measurement record and setup.", defaultValue: 0.026, defaultUnit: "mm", signed: true },
      { id: "statedTolerance", label: "Stated tolerance", symbol: "T", help: "Drawing or study tolerance entered only to display an observed-span ratio; no compliance result is generated.", defaultValue: 0.05, defaultUnit: "mm" },
    ],
    outputs: [
      { id: "observedSpan", label: "Observed {formType} extrema span", defaultUnit: "mm", expression: "measuredMaximum-measuredMinimum" },
      { id: "toleranceRatio", label: "Observed span / stated tolerance", defaultUnit: "%", expression: "(measuredMaximum-measuredMinimum)/statedTolerance*100" },
    ],
    formula: "Observed screening span = user-entered xmax − user-entered xmin",
    warnings: ["This subtracts user-entered extrema for a declared form-control record. It is not a minimum-zone algorithm and does not validate sampling density, filters, instrument calibration, probe compensation, datum/setup strategy, part geometry, drawing interpretation, uncertainty, or compliance."],
  }),
  gageRr: libraryDoc("gageRr", {
    fields: [
      { id: "aP1t1", label: "Operator A · Part 1 · Trial 1", help: "First raw observation in the fixed balanced study design.", defaultValue: 10, defaultUnit: "unit", signed: true },
      { id: "aP1t2", label: "Operator A · Part 1 · Trial 2", help: "Second raw observation in the fixed balanced study design.", defaultValue: 10.1, defaultUnit: "unit", signed: true },
      { id: "aP2t1", label: "Operator A · Part 2 · Trial 1", help: "Third raw observation in the fixed balanced study design.", defaultValue: 20, defaultUnit: "unit", signed: true },
      { id: "aP2t2", label: "Operator A · Part 2 · Trial 2", help: "Fourth raw observation in the fixed balanced study design.", defaultValue: 20.1, defaultUnit: "unit", signed: true },
      { id: "bP1t1", label: "Operator B · Part 1 · Trial 1", help: "Fifth raw observation in the fixed balanced study design.", defaultValue: 10.2, defaultUnit: "unit", signed: true },
      { id: "bP1t2", label: "Operator B · Part 1 · Trial 2", help: "Sixth raw observation in the fixed balanced study design.", defaultValue: 10.3, defaultUnit: "unit", signed: true },
      { id: "bP2t1", label: "Operator B · Part 2 · Trial 1", help: "Seventh raw observation in the fixed balanced study design.", defaultValue: 20.2, defaultUnit: "unit", signed: true },
      { id: "bP2t2", label: "Operator B · Part 2 · Trial 2", help: "Eighth raw observation in the fixed balanced study design.", defaultValue: 20.3, defaultUnit: "unit", signed: true },
    ],
    outputs: [
      { id: "repeatabilityVariance", label: "Repeatability variance component", defaultUnit: "unit²", expression: "(0.5*((aP1t1-aP1t2)^2+(aP2t1-aP2t2)^2+(bP1t1-bP1t2)^2+(bP2t1-bP2t2)^2))/4" },
      { id: "operatorVariance", label: "Operator variance component", defaultUnit: "unit²", expression: "max((4*(((aP1t1+aP1t2+aP2t1+aP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((bP1t1+bP1t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-max(0,(aP1t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP1t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP2t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP2t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP1t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP1t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP2t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP2t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2-4*(((aP1t1+aP1t2+bP1t1+bP1t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((aP2t1+aP2t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-4*(((aP1t1+aP1t2+aP2t1+aP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((bP1t1+bP1t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-0.5*((aP1t1-aP1t2)^2+(aP2t1-aP2t2)^2+(bP1t1-bP1t2)^2+(bP2t1-bP2t2)^2)))/4,0)" },
      { id: "interactionVariance", label: "Part × operator variance component", defaultUnit: "unit²", expression: "max((max(0,(aP1t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP1t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP2t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP2t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP1t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP1t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP2t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP2t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2-4*(((aP1t1+aP1t2+bP1t1+bP1t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((aP2t1+aP2t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-4*(((aP1t1+aP1t2+aP2t1+aP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((bP1t1+bP1t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-0.5*((aP1t1-aP1t2)^2+(aP2t1-aP2t2)^2+(bP1t1-bP1t2)^2+(bP2t1-bP2t2)^2))-(0.5*((aP1t1-aP1t2)^2+(aP2t1-aP2t2)^2+(bP1t1-bP1t2)^2+(bP2t1-bP2t2)^2))/4)/2,0)" },
      { id: "partVariance", label: "Part-to-part variance component", defaultUnit: "unit²", expression: "max((4*(((aP1t1+aP1t2+bP1t1+bP1t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((aP2t1+aP2t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-max(0,(aP1t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP1t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP2t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP2t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP1t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP1t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP2t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP2t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2-4*(((aP1t1+aP1t2+bP1t1+bP1t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((aP2t1+aP2t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-4*(((aP1t1+aP1t2+aP2t1+aP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((bP1t1+bP1t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-0.5*((aP1t1-aP1t2)^2+(aP2t1-aP2t2)^2+(bP1t1-bP1t2)^2+(bP2t1-bP2t2)^2)))/4,0)" },
      { id: "gageRrVariance", label: "Total Gage R&R variance", defaultUnit: "unit²", expression: "(0.5*((aP1t1-aP1t2)^2+(aP2t1-aP2t2)^2+(bP1t1-bP1t2)^2+(bP2t1-bP2t2)^2))/4+max((max(0,(aP1t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP1t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP2t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP2t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP1t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP1t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP2t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP2t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2-4*(((aP1t1+aP1t2+bP1t1+bP1t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((aP2t1+aP2t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-4*(((aP1t1+aP1t2+aP2t1+aP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((bP1t1+bP1t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-0.5*((aP1t1-aP1t2)^2+(aP2t1-aP2t2)^2+(bP1t1-bP1t2)^2+(bP2t1-bP2t2)^2))-(0.5*((aP1t1-aP1t2)^2+(aP2t1-aP2t2)^2+(bP1t1-bP1t2)^2+(bP2t1-bP2t2)^2))/4)/2,0)+max((4*(((aP1t1+aP1t2+aP2t1+aP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((bP1t1+bP1t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-max(0,(aP1t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP1t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP2t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP2t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP1t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP1t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP2t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP2t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2-4*(((aP1t1+aP1t2+bP1t1+bP1t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((aP2t1+aP2t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-4*(((aP1t1+aP1t2+aP2t1+aP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((bP1t1+bP1t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-0.5*((aP1t1-aP1t2)^2+(aP2t1-aP2t2)^2+(bP1t1-bP1t2)^2+(bP2t1-bP2t2)^2)))/4,0)" },
      { id: "gageRrShare", label: "Gage R&R share of observed study variance", defaultUnit: "%", expression: "((0.5*((aP1t1-aP1t2)^2+(aP2t1-aP2t2)^2+(bP1t1-bP1t2)^2+(bP2t1-bP2t2)^2))/4+max((max(0,(aP1t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP1t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP2t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP2t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP1t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP1t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP2t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP2t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2-4*(((aP1t1+aP1t2+bP1t1+bP1t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((aP2t1+aP2t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-4*(((aP1t1+aP1t2+aP2t1+aP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((bP1t1+bP1t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-0.5*((aP1t1-aP1t2)^2+(aP2t1-aP2t2)^2+(bP1t1-bP1t2)^2+(bP2t1-bP2t2)^2))-(0.5*((aP1t1-aP1t2)^2+(aP2t1-aP2t2)^2+(bP1t1-bP1t2)^2+(bP2t1-bP2t2)^2))/4)/2,0)+max((4*(((aP1t1+aP1t2+aP2t1+aP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((bP1t1+bP1t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-max(0,(aP1t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP1t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP2t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP2t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP1t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP1t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP2t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP2t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2-4*(((aP1t1+aP1t2+bP1t1+bP1t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((aP2t1+aP2t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-4*(((aP1t1+aP1t2+aP2t1+aP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((bP1t1+bP1t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-0.5*((aP1t1-aP1t2)^2+(aP2t1-aP2t2)^2+(bP1t1-bP1t2)^2+(bP2t1-bP2t2)^2)))/4,0))/((0.5*((aP1t1-aP1t2)^2+(aP2t1-aP2t2)^2+(bP1t1-bP1t2)^2+(bP2t1-bP2t2)^2))/4+max((max(0,(aP1t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP1t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP2t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP2t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP1t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP1t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP2t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP2t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2-4*(((aP1t1+aP1t2+bP1t1+bP1t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((aP2t1+aP2t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-4*(((aP1t1+aP1t2+aP2t1+aP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((bP1t1+bP1t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-0.5*((aP1t1-aP1t2)^2+(aP2t1-aP2t2)^2+(bP1t1-bP1t2)^2+(bP2t1-bP2t2)^2))-(0.5*((aP1t1-aP1t2)^2+(aP2t1-aP2t2)^2+(bP1t1-bP1t2)^2+(bP2t1-bP2t2)^2))/4)/2,0)+max((4*(((aP1t1+aP1t2+aP2t1+aP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((bP1t1+bP1t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-max(0,(aP1t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP1t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP2t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP2t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP1t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP1t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP2t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP2t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2-4*(((aP1t1+aP1t2+bP1t1+bP1t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((aP2t1+aP2t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-4*(((aP1t1+aP1t2+aP2t1+aP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((bP1t1+bP1t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-0.5*((aP1t1-aP1t2)^2+(aP2t1-aP2t2)^2+(bP1t1-bP1t2)^2+(bP2t1-bP2t2)^2)))/4,0)+max((4*(((aP1t1+aP1t2+bP1t1+bP1t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((aP2t1+aP2t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-max(0,(aP1t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP1t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP2t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(aP2t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP1t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP1t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP2t1-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+(bP2t2-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2-4*(((aP1t1+aP1t2+bP1t1+bP1t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((aP2t1+aP2t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-4*(((aP1t1+aP1t2+aP2t1+aP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2+((bP1t1+bP1t2+bP2t1+bP2t2)/4-(aP1t1+aP1t2+aP2t1+aP2t2+bP1t1+bP1t2+bP2t1+bP2t2)/8)^2)-0.5*((aP1t1-aP1t2)^2+(aP2t1-aP2t2)^2+(bP1t1-bP1t2)^2+(bP2t1-bP2t2)^2)))/4,0))*100" },
      { id: "repeatabilitySd", label: "Repeatability standard deviation", defaultUnit: "unit", expression: "sqrt((0.5*((aP1t1-aP1t2)^2+(aP2t1-aP2t2)^2+(bP1t1-bP1t2)^2+(bP2t1-bP2t2)^2))/4)" },
    ],
    formula: "Crossed ANOVA: SSPart, SSOperator, SSPart×Operator, SSRepeatability · VarRepeat = MSRepeat · VarOperator = max[(MSOperator−MSInteraction)/(a·n),0]",
    warnings: ["This is a fixed balanced crossed 2-operator × 2-part × 2-trial ANOVA screen with non-negative component estimates. It does not support other study designs, test significance, assess normality, establish stability, assess bias/linearity/resolution, calculate uncertainty, classify Gage R&R adequacy, or approve a measurement system."],
  }),
  measurementUncertainty: libraryDoc("measurementUncertainty", {
    fields: [
      { id: "measuredValue", label: "Measured value", help: "Reported value used only to express the relative expanded uncertainty.", defaultValue: 25, defaultUnit: "unit", signed: true },
      { id: "typeA", label: "Type A standard component", help: "User-entered standard uncertainty component from a stated statistical evaluation.", defaultValue: 0.04, defaultUnit: "unit", signed: true },
      { id: "calibration", label: "Calibration standard component", help: "User-entered standard uncertainty component; convert any stated interval before entering.", defaultValue: 0.03, defaultUnit: "unit", signed: true },
      { id: "resolution", label: "Resolution standard component", help: "User-entered standard uncertainty component for resolution or quantization.", defaultValue: 0.02, defaultUnit: "unit", signed: true },
      { id: "environment", label: "Environmental standard component", help: "User-entered standard uncertainty component for the stated environmental influence.", defaultValue: 0.01, defaultUnit: "unit", signed: true },
      { id: "coverageFactor", label: "Coverage factor", help: "User-supplied multiplier only; this screen does not select k or assert coverage probability.", defaultValue: 2, defaultUnit: "—" },
    ],
    outputs: [
      { id: "combinedStandard", label: "Combined standard uncertainty", defaultUnit: "unit", expression: "sqrt(typeA^2+calibration^2+resolution^2+environment^2)" },
      { id: "expanded", label: "Expanded uncertainty", defaultUnit: "unit", expression: "coverageFactor*sqrt(typeA^2+calibration^2+resolution^2+environment^2)" },
      { id: "relativeExpanded", label: "Relative expanded uncertainty", defaultUnit: "%", expression: "coverageFactor*sqrt(typeA^2+calibration^2+resolution^2+environment^2)/abs(measuredValue)*100" },
    ],
    formula: "uc = √(uA² + uCal² + uRes² + uEnv²) · U = k·uc",
    warnings: ["This is root-sum-square arithmetic for user-entered independent standard uncertainty components in compatible units. It does not select distributions, convert stated intervals to standard uncertainties, evaluate correlations or sensitivity coefficients, determine degrees of freedom, choose a coverage factor, assert coverage probability, or certify a result."],
  }),
  mmc: libraryDoc("mmc", {
    fields: [
      { id: "featureType", label: "Feature type", help: "Select internal hole or external pin for the displayed one-feature model.", defaultValue: 0, defaultUnit: "—", choice: ["hole", "pin"] },
      { id: "mmcSize", label: "MMC size", symbol: "MMC", help: "Smallest permitted hole or largest permitted pin size.", defaultValue: 10, defaultUnit: "mm" },
      { id: "actualSize", label: "Actual feature size", symbol: "A", help: "Measured size of the same feature in the stated condition.", defaultValue: 10.15, defaultUnit: "mm" },
      { id: "positionTolerance", label: "Position tolerance at MMC", symbol: "⌀T", help: "Stated diametrical positional tolerance at MMC.", defaultValue: 0.2, defaultUnit: "mm" },
    ],
    lookups: { isHole: { hole: 1, pin: 0 } },
    methods: {
      hole: "Bonus = actual hole − MMC hole · VC = MMC hole − ⌀T",
      pin: "Bonus = MMC pin − actual pin · VC = MMC pin + ⌀T",
    },
    methodChoice: "featureType",
    outputs: [
      { id: "bonus", label: "Available bonus tolerance", defaultUnit: "mm", expression: "(2*lookup(isHole, featureType)-1)*(actualSize-mmcSize)" },
      { id: "totalPosition", label: "Total position tolerance", defaultUnit: "mm", expression: "positionTolerance+(2*lookup(isHole, featureType)-1)*(actualSize-mmcSize)" },
      { id: "virtualCondition", label: "Simplified virtual condition", defaultUnit: "mm", expression: "mmcSize+(1-2*lookup(isHole, featureType))*positionTolerance" },
    ],
    formula: "Bonus = actual hole − MMC hole · VC = MMC hole − ⌀T",
    warnings: ["This single-feature screen assumes one cylindrical feature, one MMC position control, and no datum shift, composite frame, projected zone, or functional-gage interpretation beyond the displayed formula."],
  }),
  orientationControl: libraryDoc("orientationControl", {
    fields: [
      { id: "controlType", label: "Declared orientation control", help: "Choose the record label only; this workspace does not interpret a drawing feature-control frame.", defaultValue: 0, defaultUnit: "—", choice: ["parallelism", "perpendicularity", "angularity"] },
      { id: "minimumReading", label: "Lowest comparable reading", symbol: "rmin", help: "Lowest reading from one documented datum/fixture and measurement setup; signed readings are allowed.", defaultValue: -0.012, defaultUnit: "mm", signed: true },
      { id: "maximumReading", label: "Highest comparable reading", symbol: "rmax", help: "Highest reading from the same documented datum/fixture and measurement setup.", defaultValue: 0.028, defaultUnit: "mm", signed: true },
      { id: "tolerance", label: "Stated orientation tolerance", symbol: "T", help: "Tolerance copied from the applicable controlled requirement; it is not inferred from a drawing.", defaultValue: 0.05, defaultUnit: "mm" },
    ],
    outputs: [
      { id: "variation", label: "Observed orientation-reading variation", defaultUnit: "mm", expression: "maximumReading-minimumReading" },
      { id: "ratio", label: "Observed variation / stated tolerance", defaultUnit: "%", expression: "(maximumReading-minimumReading)/tolerance*100" },
      { id: "difference", label: "Stated tolerance − observed variation", defaultUnit: "mm", expression: "tolerance-(maximumReading-minimumReading)" },
    ],
    formula: "observed variation = rmax − rmin · ratio = observed variation / stated tolerance",
    warnings: ["This is extrema subtraction for a user-declared {controlType} record. It does not establish datum simulation, validate feature-control-frame syntax, construct a tolerance zone, choose a measurement strategy, compensate instruments, assess repeatability, determine conformance, or certify drawing compliance."],
  }),
  position: libraryDoc("position", {
    fields: [
      { id: "x", label: "Measured X offset", symbol: "Δx", help: "Measured center offset in the declared datum frame.", family: "length", defaultValue: 0.003, defaultUnit: "mm", signed: true },
      { id: "y", label: "Measured Y offset", symbol: "Δy", help: "Measured center offset in the declared datum frame.", family: "length", defaultValue: 0.002, defaultUnit: "mm", signed: true },
      { id: "tolerance", label: "Stated position tolerance", symbol: "⌀T", help: "Diametrical positional tolerance for this simplified screen.", family: "length", defaultValue: 0.008, defaultUnit: "mm" }
    ],
    outputs: [
      { id: "diametricalDeviation", label: "Diametrical position deviation", family: "length", defaultUnit: "mm", expression: "(2*sqrt((x/0.001)^2+(y/0.001)^2))*0.001" },
      { id: "radialOffset", label: "Radial center offset", family: "length", defaultUnit: "mm", expression: "(sqrt((x/0.001)^2+(y/0.001)^2))*0.001" },
      { id: "remainingMargin", label: "Remaining tolerance margin", family: "length", defaultUnit: "mm", expression: "((tolerance/0.001)-2*sqrt((x/0.001)^2+(y/0.001)^2))*0.001" }
    ],
    formula: "⌀ deviation = 2√(Δx² + Δy²)",
    warnings: ["The calculated two-dimensional deviation is within the entered tolerance. Confirm datum establishment, feature size, orientation, depth, and inspection method separately."],
  }),
  processCapability: libraryDoc("processCapability", {
    fields: [
      { id: "lsl", label: "Lower specification limit", symbol: "LSL", help: "User-entered lower requirement limit on the measured characteristic.", defaultValue: 9.8, defaultUnit: "unit", signed: true },
      { id: "usl", label: "Upper specification limit", symbol: "USL", help: "User-entered upper requirement limit on the same characteristic.", defaultValue: 10.2, defaultUnit: "unit" },
      { id: "mean", label: "Process mean", symbol: "x̄", help: "Established process mean on the same measurement basis.", defaultValue: 10.04, defaultUnit: "unit", signed: true },
      { id: "sigma", label: "Within-process standard deviation", symbol: "s", help: "User-entered within-process standard deviation; establish its suitability separately.", defaultValue: 0.05, defaultUnit: "unit" },
    ],
    outputs: [
      { id: "cp", label: "Potential capability Cp", defaultUnit: "—", expression: "(usl-lsl)/(6*sigma)" },
      { id: "cpk", label: "Centered capability Cpk", defaultUnit: "—", expression: "min((usl-mean)/(3*sigma), (mean-lsl)/(3*sigma))" },
      { id: "cpu", label: "Upper capability Cpu", defaultUnit: "—", expression: "(usl-mean)/(3*sigma)" },
      { id: "cpl", label: "Lower capability Cpl", defaultUnit: "—", expression: "(mean-lsl)/(3*sigma)" },
    ],
    formula: "Cp = (USL−LSL)/(6s) · Cpk = min[(USL−x̄)/(3s), (x̄−LSL)/(3s)]",
    warnings: ["Cp and Cpk compare user-entered specifications with user-entered process statistics. This screen does not establish statistical control, distribution suitability, rational subgrouping, measurement-system adequacy, sampling validity, customer requirements, capability thresholds, or production acceptance."],
  }),
  profileRunout: libraryDoc("profileRunout", {
    fields: [
      { id: "recordType", label: "Declared record type", help: "Choose the record label only; this workspace does not construct a profile or runout tolerance zone.", defaultValue: 0, defaultUnit: "—", choice: ["profile", "circularRunout", "totalRunout"] },
      { id: "minimumReading", label: "Lowest comparable indicator reading", symbol: "rmin", help: "Lowest reading from the one documented fixture/datum setup; signed readings are allowed.", defaultValue: -0.018, defaultUnit: "mm", signed: true },
      { id: "maximumReading", label: "Highest comparable indicator reading", symbol: "rmax", help: "Highest reading from the same documented fixture/datum setup.", defaultValue: 0.032, defaultUnit: "mm", signed: true },
      { id: "tolerance", label: "Stated profile/runout tolerance", symbol: "T", help: "Tolerance copied from the applicable controlled requirement; this is not a drawing-parser field.", defaultValue: 0.06, defaultUnit: "mm" },
    ],
    outputs: [
      { id: "variation", label: "Observed indicator variation", defaultUnit: "mm", expression: "maximumReading-minimumReading" },
      { id: "ratio", label: "Observed variation / stated tolerance", defaultUnit: "%", expression: "(maximumReading-minimumReading)/tolerance*100" },
      { id: "difference", label: "Stated tolerance − observed variation", defaultUnit: "mm", expression: "tolerance-(maximumReading-minimumReading)" },
    ],
    formula: "observed variation = rmax − rmin · ratio = observed variation / stated tolerance",
    warnings: ["This is extrema subtraction for a user-declared {recordType} record. It does not establish a datum axis, construct profile or runout zones, parse feature-control frames, select fixture/CMM/indicator strategy, assess measurement uncertainty, determine conformance, or certify drawing compliance."],
  }),
  toleranceStack: libraryDoc("toleranceStack", {
    fields: [
      { id: "nominal", label: "Nominal chain result", symbol: "N", help: "Nominal one-dimensional result before contributor variation.", defaultValue: 100, defaultUnit: "mm", signed: true },
      { id: "t1", label: "Contributor 1 tolerance", symbol: "±t₁", help: "Symmetric stated tolerance magnitude for the first contributor.", defaultValue: 0.1, defaultUnit: "mm" },
      { id: "t2", label: "Contributor 2 tolerance", symbol: "±t₂", help: "Symmetric stated tolerance magnitude for the second contributor.", defaultValue: 0.05, defaultUnit: "mm" },
      { id: "t3", label: "Contributor 3 tolerance", symbol: "±t₃", help: "Symmetric stated tolerance magnitude for the third contributor.", defaultValue: 0.03, defaultUnit: "mm" },
      { id: "t4", label: "Contributor 4 tolerance", symbol: "±t₄", help: "Optional visible contributor; enter 0 when unused.", defaultValue: 0, defaultUnit: "mm", signed: true },
      { id: "t5", label: "Contributor 5 tolerance", symbol: "±t₅", help: "Optional visible contributor; enter 0 when unused.", defaultValue: 0, defaultUnit: "mm", signed: true },
      { id: "t6", label: "Contributor 6 tolerance", symbol: "±t₆", help: "Optional visible contributor; enter 0 when unused.", defaultValue: 0, defaultUnit: "mm", signed: true },
    ],
    outputs: [
      { id: "worstCase", label: "Worst-case stack tolerance", defaultUnit: "mm", expression: "abs(t1)+abs(t2)+abs(t3)+abs(t4)+abs(t5)+abs(t6)" },
      { id: "rss", label: "RSS stack tolerance", defaultUnit: "mm", expression: "sqrt(t1^2+t2^2+t3^2+t4^2+t5^2+t6^2)" },
      { id: "worstMin", label: "Worst-case lower result", defaultUnit: "mm", expression: "nominal-(abs(t1)+abs(t2)+abs(t3)+abs(t4)+abs(t5)+abs(t6))" },
      { id: "worstMax", label: "Worst-case upper result", defaultUnit: "mm", expression: "nominal+(abs(t1)+abs(t2)+abs(t3)+abs(t4)+abs(t5)+abs(t6))" },
    ],
    formula: "TWC = Σ|tᵢ| · TRSS = √(Σtᵢ²), up to six visible contributors",
    warnings: ["RSS is a statistical combination only when contributors are independent and the stated distribution assumption is justified. This is a linear one-dimensional stack, not a complete GD&T or assembly analysis; it makes no compliance, yield, or tolerance-recommendation claim."],
  }),
};
