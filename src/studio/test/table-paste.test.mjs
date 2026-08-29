import assert from "node:assert/strict";
import test from "node:test";
import {
  detectDelimiter,
  identifierFrom,
  parseNumber,
  parseTableText,
  unitHintFrom,
} from "@/studio/lib/table-paste.ts";

/** What copying eight cells out of Excel actually puts on the clipboard. */
const EXCEL_PASTE = [
  "Size\tAs (mm²)\tPitch (mm)",
  "M6\t20.1\t1",
  "M8\t36.6\t1.25",
  "M10\t58.0\t1.5",
  "M12\t84.3\t1.75",
].join("\n");

test("a spreadsheet paste is read as tab-separated", () => {
  assert.deepEqual(detectDelimiter(EXCEL_PASTE), { delimiter: "\t", decimalComma: false });
  const parsed = parseTableText(EXCEL_PASTE);
  assert.deepEqual(parsed.issues, []);
  assert.equal(parsed.keyHeader, "Size");
  assert.deepEqual(parsed.headers, ["As (mm²)", "Pitch (mm)"]);
  assert.deepEqual(parsed.rows, [
    { key: "M6", values: [20.1, 1] },
    { key: "M8", values: [36.6, 1.25] },
    { key: "M10", values: [58, 1.5] },
    { key: "M12", values: [84.3, 1.75] },
  ]);
});

test("a csv file is the same text arriving differently", () => {
  const parsed = parseTableText("Size,As\nM6,20.1\nM8,36.6");
  assert.deepEqual(parsed.issues, []);
  assert.deepEqual(parsed.rows, [
    { key: "M6", values: [20.1] },
    { key: "M8", values: [36.6] },
  ]);
});

test("a quoted cell containing the delimiter does not shift the row", () => {
  // The failure this prevents is the dangerous one: a naive split turns
  // `"1,234"` into two columns, every later value slides one place left, and
  // the table still looks entirely plausible.
  const parsed = parseTableText('Size,Load\nM6,"1,234"\nM8,"2,000"');
  assert.deepEqual(parsed.issues, []);
  assert.deepEqual(parsed.rows, [
    { key: "M6", values: [1234] },
    { key: "M8", values: [2000] },
  ]);
});

test("a semicolon file is read with a decimal comma", () => {
  assert.deepEqual(detectDelimiter("Size;As\nM6;20,1"), { delimiter: ";", decimalComma: true });
  const parsed = parseTableText("Size;As\nM6;20,1\nM8;36,6");
  assert.deepEqual(parsed.rows, [
    { key: "M6", values: [20.1] },
    { key: "M8", values: [36.6] },
  ]);
});

test("decorated numbers are read, not refused", () => {
  assert.equal(parseNumber("1 234"), 1234);
  assert.equal(parseNumber("1,234.5"), 1234.5);
  assert.equal(parseNumber("84.3 mm²"), 84.3);
  assert.equal(parseNumber("> 3"), 3);
  assert.equal(parseNumber("−12"), -12, "a Unicode minus is still a minus");
  assert.equal(parseNumber("1.5e3"), 1500);
  assert.equal(parseNumber("0,45", true), 0.45);
  assert.equal(parseNumber(""), undefined);
  assert.equal(parseNumber("n/a"), undefined);
});

test("a footnote row is skipped and reported, not thrown", () => {
  const parsed = parseTableText(["Size\tAs", "M6\t20.1", "* coarse pitch only\t", "M8\t36.6"].join("\n"));
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.issues.length, 1);
  assert.match(parsed.issues[0], /Row 3 skipped/);
  assert.match(parsed.issues[0], /coarse pitch only/);
});

test("a table with no header row is still usable", () => {
  const parsed = parseTableText("M6\t20.1\nM8\t36.6");
  assert.deepEqual(parsed.headers, ["Column 1"]);
  assert.equal(parsed.rows.length, 2);
  assert.match(parsed.issues[0], /No header row/);
});

test("range bands come in as min and max", () => {
  const parsed = parseTableText(
    ["Over\tUp to\tIT7\tIT8", "3\t6\t12\t18", "6\t10\t15\t22", "10\t18\t18\t27"].join("\n"),
    "range",
  );
  assert.deepEqual(parsed.issues, []);
  assert.deepEqual(parsed.headers, ["IT7", "IT8"]);
  assert.deepEqual(parsed.rows, [
    { min: 3, max: 6, values: [12, 18] },
    { min: 6, max: 10, values: [15, 22] },
    { min: 10, max: 18, values: [18, 27] },
  ]);
});

test("an inverted band is refused rather than silently never matching", () => {
  const parsed = parseTableText(["Over\tUp to\tIT7", "6\t3\t12"].join("\n"), "range");
  assert.equal(parsed.rows.length, 0);
  assert.match(parsed.issues.join(" "), /upper bound is not above/);
});

test("too few columns says which shape was expected", () => {
  assert.match(parseTableText("M6\nM8").issues.join(" "), /at least two columns/);
  assert.match(parseTableText("3\t6", "range").issues.join(" "), /at least three columns/);
});

test("a repeated key is reported, because only the first one is ever used", () => {
  const parsed = parseTableText("Size\tAs\nM6\t20.1\nM6\t99");
  assert.match(parsed.issues.join(" "), /"M6" appears more than once/);
});

test("an empty paste says so instead of producing an empty table", () => {
  assert.match(parseTableText("   \n\n").issues.join(" "), /empty/);
});

test("headers become identifiers an expression can reference", () => {
  const taken = new Set();
  assert.equal(identifierFrom("As (mm²)", taken), "as");
  taken.add("as");
  assert.equal(identifierFrom("As (mm²)", taken), "as2", "a clash gets a suffix, not a silent overwrite");
  assert.equal(identifierFrom("Tensile strength, MPa", new Set()), "tensileStrength");
  assert.equal(identifierFrom("2nd moment", new Set()), "col2ndMoment", "an identifier cannot start with a digit");
});

test("the unit in a header is offered rather than discarded", () => {
  assert.equal(unitHintFrom("As (mm²)"), "mm²");
  assert.equal(unitHintFrom("Tensile strength, MPa"), "MPa");
  assert.equal(unitHintFrom("Size"), undefined);
});
