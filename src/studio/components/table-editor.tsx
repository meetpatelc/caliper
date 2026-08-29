import { useState } from "react";
import { ICON } from "@instrument/ui";
import { Plus, Trash2, Undo2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { panelClass } from "@/components/ui/panel";
import { Field as FormField, Input, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { unitFamilyOptions, unitsForFamily, type UnitFamilyId } from "@/lib/units";
import type { CalculatorDefinition, TableDefinition } from "@/studio/lib/calculator-types";
import { identifierFrom, parseTableText, unitHintFrom, type TableKind } from "@/studio/lib/table-paste";

/**
 * Authoring for lookup tables, which the engine has always supported and
 * nothing could create.
 *
 * `resolveTables` and the `tables` schema shipped long ago, and one calculator
 * uses them — the metric bolt one, whose eight ISO 898-1 stress areas were
 * typed into a source file. There was no screen anywhere that could produce
 * another, so the whole class of tool that answers "pick M12" instead of
 * "look up the stress area yourself" was unreachable to anyone but us.
 *
 * Built around pasting rather than typing, because the tables worth adding are
 * not eight numbers. Everything shipping today is eight cells or fewer; ISO 286
 * is about 290. Cell-by-cell entry is fine for the first and unusable for the
 * second, and a table nobody can enter is a table nobody adds.
 */

const MAX_TABLES = 6;
const MAX_ROWS = 80;

type Props = {
  draft: CalculatorDefinition;
  setDraft: (next: CalculatorDefinition) => void;
};

/** Names already spoken for: every field, every result, every other column. */
function takenNames(draft: CalculatorDefinition, exceptTable?: string) {
  const taken = new Set<string>();
  for (const field of draft.fields) taken.add(field.id);
  for (const output of draft.outputs) taken.add(output.id);
  for (const table of draft.tables ?? []) {
    if (table.id === exceptTable) continue;
    for (const column of table.columns) taken.add(column.id);
  }
  return taken;
}

export function TablesFieldset({ draft, setDraft }: Props) {
  const tables = draft.tables ?? [];
  const choiceFields = draft.fields.filter((field) => field.input === "choice");
  const numericFields = draft.fields.filter((field) => field.input !== "choice");

  const patchTable = (index: number, patch: Partial<TableDefinition>) => {
    const next = tables.map((table, position) => (position === index ? { ...table, ...patch } : table));
    setDraft({ ...draft, tables: next });
  };

  const addTable = () => {
    const taken = new Set(tables.map((table) => table.id));
    let id = "table";
    let suffix = 2;
    while (taken.has(id)) id = `table${suffix++}`;
    setDraft({
      ...draft,
      tables: [
        ...tables,
        {
          id,
          name: "",
          kind: "keyed",
          matchField: choiceFields[0]?.id ?? draft.fields[0]?.id ?? "",
          columns: [],
          // A table with no rows cannot save; the paste fills this in, and the
          // placeholder keeps the schema shape valid while it is being edited.
          rows: [],
        } as TableDefinition,
      ],
    });
  };

  return (
    <fieldset className={cn(panelClass, "grid gap-3 p-4")}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Tables</p>
          <p className="mt-1 text-sm text-muted">
            Paste a table from a spreadsheet. A dropdown input picks the row; the columns become names your formula can
            use.
          </p>
        </div>
        {tables.length < MAX_TABLES && (
          <Button variant="ghost" className="text-accent" onClick={addTable}>
            <Plus size={ICON.inline} /> Add
          </Button>
        )}
      </div>

      {tables.length === 0 ? (
        <p className="text-sm text-muted">
          None yet. A table is how a model looks up a standard value — pick a bolt size, get its stress area — instead of
          asking someone to find the number first.
        </p>
      ) : (
        tables.map((table, index) => (
          // Keyed by position for the same reason the input rows are: the id is
          // editable, and a key that changes mid-edit unmounts the row.
          <TableRow
            key={index}
            table={table}
            draft={draft}
            choiceFields={choiceFields}
            numericFields={numericFields}
            onPatch={(patch) => patchTable(index, patch)}
            onRemove={() => setDraft({ ...draft, tables: tables.filter((_, position) => position !== index) })}
          />
        ))
      )}
    </fieldset>
  );
}

function TableRow({
  table,
  draft,
  choiceFields,
  numericFields,
  onPatch,
  onRemove,
}: {
  table: TableDefinition;
  draft: CalculatorDefinition;
  choiceFields: CalculatorDefinition["fields"];
  numericFields: CalculatorDefinition["fields"];
  onPatch: (patch: Partial<TableDefinition>) => void;
  onRemove: () => void;
}) {
  const [pasted, setPasted] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [readError, setReadError] = useState<string | null>(null);
  /**
   * The table as it was before the last paste.
   *
   * Nothing in the editor is undoable — every edit autosaves 400ms after a
   * keystroke and a `WorkshopCalculator` keeps `updatedAt` and no revisions.
   * That was survivable while the destructive gestures were keystroke-sized.
   * A paste is not: it replaces every row and column in one action, so
   * correcting a table and pasting the wrong column order over a good one
   * destroyed three hundred values with nothing to go back to.
   *
   * Held in component state on purpose. It is a guard against the gesture that
   * just happened, not a history feature, and it should not outlive the panel.
   */
  const [replaced, setReplaced] = useState<Pick<TableDefinition, "columns" | "rows"> | null>(null);

  const eligible = table.kind === "keyed" ? choiceFields : numericFields;

  /**
   * Read pasted text into columns and rows.
   *
   * Replaces the table wholesale rather than merging. A second paste is a
   * correction, not an append, and silently doubling a table because someone
   * pasted twice is worse than losing an edit they can redo.
   */
  const applyText = (text: string, kind: TableKind = table.kind) => {
    const parsed = parseTableText(text, kind);
    setIssues(parsed.issues);
    if (!parsed.rows.length) return;

    const rows = parsed.rows.slice(0, MAX_ROWS);
    if (parsed.rows.length > MAX_ROWS) {
      setIssues([...parsed.issues, `Only the first ${MAX_ROWS} rows were kept.`]);
    }

    // Only worth keeping if there was something to lose.
    if (table.rows.length) setReplaced({ columns: table.columns, rows: table.rows });

    const taken = takenNames(draft, table.id);
    const columns = parsed.headers.map((header, position) => {
      const previous = table.columns[position];
      const id = previous?.id ?? identifierFrom(header, taken);
      taken.add(id);
      const hint = unitHintFrom(header);
      // A unit named in the header is offered, but only if it is a unit some
      // family actually knows — a header reading "(ref)" is not a unit.
      const family = previous?.family ?? familyOwning(hint);
      return {
        id,
        label: header,
        family,
        // The symbol, not the id. `resolveUnit` accepts either, so storing the
        // id worked — and then printed "As (area.mm2)" in the preview and
        // disagreed with every hand-written calculator, which stores "mm²".
        unit: family ? (resolveHint(family, hint) ?? unitsForFamily(family)[0]?.label ?? "1") : (hint ?? "1"),
      };
    });

    onPatch({
      columns,
      rows: rows.map((row) => ({ key: row.key, min: row.min, max: row.max, values: row.values })),
      name: table.name || (parsed.keyHeader ? `${parsed.keyHeader} table` : "Pasted table"),
    });
  };

  const cellCount = table.rows.length * (table.columns.length || 1);

  return (
    <div className={cn(panelClass, "grid gap-3 bg-elevated p-3")}>
      <div className="flex items-center gap-2">
        <Input
          value={table.name}
          onChange={(event) => onPatch({ name: event.target.value })}
          aria-label="Table name"
          placeholder="ISO 898-1 coarse stress area"
        />
        <Button
          variant="ghost"
          size="icon"
          className="text-muted hover:text-danger"
          aria-label={`Remove ${table.name || "table"}`}
          onClick={onRemove}
        >
          <Trash2 size={ICON.base} />
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <FormField htmlFor={`table-${table.id}-kind`} label="Row is picked by">
          <Select
            id={`table-${table.id}-kind`}
            value={table.kind}
            onChange={(event) => {
              const kind = event.target.value as TableKind;
              const fallback = (kind === "keyed" ? choiceFields : numericFields)[0]?.id ?? "";
              onPatch({ kind, matchField: fallback, rows: [] });
              setIssues(kind === "range" ? ["Paste again — a band table needs a lower and upper bound column."] : []);
            }}
          >
            <option value="keyed">A dropdown choice</option>
            <option value="range">A number falling in a band</option>
          </Select>
        </FormField>

        <FormField
          htmlFor={`table-${table.id}-match`}
          label={table.kind === "keyed" ? "Dropdown input" : "Numeric input"}
          error={
            eligible.length === 0
              ? table.kind === "keyed"
                ? "Add a list input above first — a keyed table needs a dropdown to pick the row."
                : "Add a numeric input above first."
              : undefined
          }
        >
          <Select
            id={`table-${table.id}-match`}
            value={table.matchField}
            onChange={(event) => onPatch({ matchField: event.target.value })}
            disabled={eligible.length === 0}
          >
            {eligible.map((field) => (
              <option key={field.id} value={field.id}>
                {field.label || field.id}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField
        htmlFor={`table-${table.id}-paste`}
        label="Paste from a spreadsheet"
        hint={
          table.kind === "keyed"
            ? "First column is the dropdown value, then one column per number. A header row is used for the names."
            : "First two columns are the band's lower and upper bound, then one column per number."
        }
      >
        <Textarea
          id={`table-${table.id}-paste`}
          rows={3}
          value={pasted}
          spellCheck={false}
          className="font-mono text-xs"
          placeholder={
            table.kind === "keyed" ? "Size\tAs (mm²)\nM6\t20.1\nM8\t36.6" : "Over\tUp to\tIT7\n3\t6\t12\n6\t10\t15"
          }
          onChange={(event) => {
            setPasted(event.target.value);
            if (event.target.value.trim()) applyText(event.target.value);
          }}
        />
      </FormField>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-accent">
          <Upload size={ICON.inline} />
          <span>Or upload a .csv</span>
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className="sr-only"
            onChange={async (event) => {
              setReadError(null);
              const file = event.target.files?.[0];
              // Reset immediately so choosing the same file twice re-fires.
              event.target.value = "";
              if (!file) return;
              if (file.size > 512 * 1024) {
                setReadError("That file is over 512 KB — far larger than any table this holds.");
                return;
              }
              try {
                const text = await file.text();
                setPasted(text);
                applyText(text);
              } catch {
                setReadError("That file could not be read as text.");
              }
            }}
          />
        </label>
        {table.rows.length > 0 && (
          <p className="text-xs text-muted">
            {table.rows.length} rows × {table.columns.length} columns · {cellCount} values
          </p>
        )}
        {replaced && (
          <Button
            variant="ghost"
            size="sm"
            className="text-accent"
            onClick={() => {
              onPatch(replaced);
              setReplaced(null);
              setPasted("");
              setIssues([]);
            }}
          >
            <Undo2 size={ICON.inline} /> Undo paste ({replaced.rows.length} rows)
          </Button>
        )}
      </div>

      {readError && <p className="text-sm text-danger">{readError}</p>}

      {issues.length > 0 && (
        <ul className="grid gap-1 text-xs text-muted">
          {issues.map((issue) => (
            <li key={issue}>· {issue}</li>
          ))}
        </ul>
      )}

      {table.columns.length > 0 && (
        <div className="grid gap-2">
          <p className="text-xs uppercase tracking-wide text-muted">Columns</p>
          {table.columns.map((column, position) => (
            <div key={position} className="grid gap-2 sm:grid-cols-[1fr_1fr_7rem]">
              <Input
                value={column.label}
                onChange={(event) => {
                  const columns = [...table.columns];
                  columns[position] = { ...column, label: event.target.value };
                  onPatch({ columns });
                }}
                aria-label={`Column ${position + 1} name`}
              />
              <Select
                value={column.family ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  const family = value ? (value as UnitFamilyId) : undefined;
                  const columns = [...table.columns];
                  columns[position] = {
                    ...column,
                    family,
                    unit: family ? (unitsForFamily(family)[0]?.label ?? "1") : "1",
                  };
                  onPatch({ columns });
                }}
                aria-label={`Column ${position + 1} quantity kind`}
              >
                <option value="">Number — no conversion</option>
                {unitFamilyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {column.family ? (
                <Select
                  value={column.unit}
                  onChange={(event) => {
                    const columns = [...table.columns];
                    columns[position] = { ...column, unit: event.target.value };
                    onPatch({ columns });
                  }}
                  aria-label={`Column ${position + 1} unit`}
                >
                  {unitsForFamily(column.family).map((unit) => (
                    <option key={unit.id} value={unit.label}>
                      {unit.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input value="—" readOnly aria-label={`Column ${position + 1} unit`} />
              )}
              <p className="font-mono text-xs text-muted sm:col-span-3">in the formula as {column.id}</p>
            </div>
          ))}
        </div>
      )}

      {table.rows.length > 0 && <TablePreview table={table} />}
    </div>
  );
}

/**
 * What was understood, shown back before it is trusted.
 *
 * A pasted table can be wrong in a way a formula cannot: a shifted column or a
 * misread decimal produces numbers that are entirely plausible and entirely
 * wrong, with nothing to check them against. Seeing the first rows next to the
 * headers is the only chance anyone gets to notice.
 */
function TablePreview({ table }: { table: TableDefinition }) {
  const shown = table.rows.slice(0, 6);
  return (
    <div className="grid gap-1">
      <p className="text-xs uppercase tracking-wide text-muted">
        Check this{table.rows.length > shown.length ? ` — first ${shown.length} of ${table.rows.length} rows` : ""}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs tabular-nums">
          <thead className="text-muted">
            <tr>
              <th className="pr-4 font-normal">{table.kind === "keyed" ? "Key" : "Band"}</th>
              {table.columns.map((column) => (
                <th key={column.id} className="pr-4 font-normal">
                  {column.label} {column.family ? `(${column.unit})` : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, index) => (
              <tr key={index}>
                <td className="pr-4 font-mono">{table.kind === "keyed" ? row.key : `${row.min} – ${row.max}`}</td>
                {row.values.map((value, position) => (
                  <td key={position} className="pr-4">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** The first family that recognises a unit written in a column header. */
function familyOwning(hint: string | undefined): UnitFamilyId | undefined {
  if (!hint) return undefined;
  for (const option of unitFamilyOptions) {
    const family = option.value as UnitFamilyId;
    if (unitsForFamily(family).some((unit) => unit.label === hint || unit.id === hint)) return family;
  }
  return undefined;
}

/** The header's unit, as this family spells it. */
function resolveHint(family: UnitFamilyId, hint: string | undefined) {
  if (!hint) return undefined;
  const match = unitsForFamily(family).find((unit) => unit.label === hint || unit.id === hint);
  return match?.label;
}
