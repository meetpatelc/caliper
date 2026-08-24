export type ConversionKind = "linear" | "affine";
export type UnitStatus = "canonical" | "compatibility";

type UnitBase = {
  id: string;
  symbol: string;
  label: string;
  aliases: string[];
  status: UnitStatus;
  note?: string;
};

export type LinearUnit = UnitBase & {
  kind: "linear";
  factor: number;
};

export type AffineUnit = UnitBase & {
  kind: "affine";
  scale: number;
  offset: number;
};

export type UnitDefinition = LinearUnit | AffineUnit;

export type FamilyDefinition = {
  id: string;
  label: string;
  canonicalUnit: string;
  sources: string[];
  units: UnitDefinition[];
  note?: string;
};

export type Inventory = {
  version: string;
  kinds: ConversionKind[];
  referenceDependent: boolean;
  notes: string[];
  families: FamilyDefinition[];
};

export type Conversion = {
  converted: number;
  canonical: number;
  canonicalUnit: string;
  family: string;
  familyId: string;
  fromId: string;
  toId: string;
};
