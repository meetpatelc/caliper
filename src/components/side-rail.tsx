import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageSquare, Repeat, Star } from "lucide-react";
import { ICON, SideTabs } from "@instrument/ui";
import { tools } from "@/lib/catalog";
import { conversionUnits, type ConversionGroup } from "@/lib/engineering";
import { convertQuantity, unitFamilies, unitSymbol, type UnitFamilyId } from "@/lib/units";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useDeskStatus } from "@/lib/desk-mode";
import { useDeskStore } from "@/lib/workspace-store";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { EmptyState, LoadingState } from "@/components/ui/status";

/**
 * The three tabs down the right edge.
 *
 * Replaces a favourites rail that lived in the viewport gutter and was
 * `hidden min-[1440px]:block` — so on a 1366px laptop, which is most of them,
 * there was no way to reach a favourite at all. A tab needs 36px, not a
 * 260px gutter, so this works at every width.
 *
 * Conversion and feedback are here for the same reason favourites is: they are
 * things you want *while* looking at something else. Sending someone to
 * /tool/converter to check a unit costs them the page they were reading.
 */
export function SideRail() {
  const pinned = useDeskStore((state) => state.pinnedTabs);
  const setPinned = useDeskStore((state) => state.setTabPinned);

  return (
    <div className="no-print">
      <SideTabs
        pinned={pinned}
        onPinnedChange={setPinned}
        items={[
          {
            id: "favourites",
            label: "Favourites",
            icon: <Star size={ICON.inline} aria-hidden="true" />,
            pinnable: true,
            content: <FavouriteList />,
          },
          {
            id: "convert",
            label: "Convert",
            icon: <Repeat size={ICON.inline} aria-hidden="true" />,
            pinnable: true,
            content: <QuickConvert />,
          },
          {
            id: "feedback",
            label: "Feedback",
            icon: <MessageSquare size={ICON.inline} aria-hidden="true" />,
            content: (
              <>
                <p className="text-sm leading-6 text-muted">
                  Something wrong, or missing? A screenshot helps more than a description.
                </p>
                <Button asChild variant="outline" className="mt-3 w-full">
                  <Link to="/feedback">Report it</Link>
                </Button>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}

function FavouriteList() {
  const favorites = useDeskStore((state) => state.favorites);
  const { hydrating } = useDeskStatus();
  const { isPending } = useCurrentUserState();
  const loading = hydrating || isPending;
  const favouriteTools = favorites.map((id) => tools.find((tool) => tool.id === id)).filter(Boolean);

  if (loading) {
    return <LoadingState>{hydrating ? "Loading the account desk." : "Loading."}</LoadingState>;
  }
  if (!favouriteTools.length) {
    return <EmptyState className="leading-6">Favourite a model. It stays here.</EmptyState>;
  }
  return (
    <ul className="grid gap-1">
      {favouriteTools.map((tool) => (
        <li key={tool!.id}>
          <Link to="/tool/$toolId" params={{ toolId: tool!.id }} className="link-accent block py-1.5 text-sm">
            {tool!.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Convert one number without leaving the page.
 *
 * Reuses the converter's own family and unit tables rather than a second list,
 * so a unit that works in the tool works here and there is one place to add the
 * next one.
 */
function QuickConvert() {
  const [family, setFamily] = useState<UnitFamilyId>("length");
  const units = conversionUnits(family as ConversionGroup);
  const [from, setFrom] = useState(units[0] ?? "");
  const [to, setTo] = useState(units[1] ?? units[0] ?? "");
  const [value, setValue] = useState("1");

  const parsed = Number(value);
  let result = "";
  if (Number.isFinite(parsed) && from && to) {
    try {
      result = String(Number(convertQuantity(family, parsed, from, to).converted.toPrecision(6)));
    } catch {
      result = "";
    }
  }

  const onFamily = (next: UnitFamilyId) => {
    const nextUnits = conversionUnits(next as ConversionGroup);
    setFamily(next);
    setFrom(nextUnits[0] ?? "");
    setTo(nextUnits[1] ?? nextUnits[0] ?? "");
  };

  return (
    <div className="grid gap-3">
      <Field htmlFor="rail-family" label="Quantity">
        <Select id="rail-family" value={family} onChange={(event) => onFamily(event.target.value as UnitFamilyId)}>
          {Object.values(unitFamilies).map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field htmlFor="rail-value" label="Value">
        <Input id="rail-value" inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field htmlFor="rail-from" label="From">
          <Select id="rail-from" value={from} onChange={(event) => setFrom(event.target.value)}>
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unitSymbol(family, unit)}
              </option>
            ))}
          </Select>
        </Field>
        <Field htmlFor="rail-to" label="To">
          <Select id="rail-to" value={to} onChange={(event) => setTo(event.target.value)}>
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unitSymbol(family, unit)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <p className="font-mono text-sm tabular-nums" role="status">
        {result ? `${result} ${unitSymbol(family, to)}` : "—"}
      </p>
    </div>
  );
}
