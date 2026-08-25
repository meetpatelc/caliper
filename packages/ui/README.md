# Instrument UI

Shared **Metrology** tokens and primitives for Instrument.

This is not a second product. It lives in the Instrument repo (`packages/ui`) and is consumed as `@instrument/ui`.

## The rule

**One implementation per interaction.** Product surfaces compose these; they do not restyle them and they do not hand-roll alternatives. Two rules in `eslint.config.mjs` enforce the parts that matter most:

- No raw hex and no Tailwind palette colours in `src/**` — use the semantic tokens below. Dark mode reassigns token *names*, so `text-red-500` silently stops following the theme.
- No bare `<button>` in `src/**` — a raw element misses the shared focus ring, sizing, and variants.

If you need something the kit cannot express, add it to the kit.

---

## Tokens

Defined once in [`src/tokens.css`](src/tokens.css). `html.dark` reassigns the same names, which is why theming needs no component changes.

### Colour

| Token | Role | Light | Dark |
| --- | --- | --- | --- |
| `bg` | page ground | `#e8eaed` | `#14161a` |
| `surface` | cards, raised panels | `#f4f5f7` | `#1c1f26` |
| `elevated` | hover fill, menus | `#ffffff` | `#262a33` |
| `fg` | primary text | `#1b1e24` | `#e8eaed` |
| `muted` | secondary text, meta | `#5c6370` | `#8b909a` |
| `accent` | DIN red — primary action, links | `#c8102e` | `#e23b4c` |
| `accent-fg` | text on accent | `#ffffff` | `#ffffff` |
| `mark` | emphasis, hover on accent | `#c8102e` | `#e23b4c` |
| `border` | hairlines, control borders | `#cfd3da` | `#2e333d` |
| `danger` | destructive, errors | `#9b1830` | `#f07178` |
| `ok` | success | `#2f6f4e` | `#5ea86a` |

Use as Tailwind utilities: `bg-surface`, `text-muted`, `border-border`, `fill-accent`.

> `THEME_COLOR` in `src/lib/instrument.ts` duplicates `--color-bg` because a `<meta name="theme-color">` cannot reference a CSS variable. It is pinned to this table by `theme-color.test.mjs`.

### Type, radius, spacing

- `--font-sans` IBM Plex Sans · `--font-mono` IBM Plex Mono
- `--radius-sm` 2px · `--radius-md` 4px (**the default**) · `--radius-lg` 6px
- `--spacing-control` 2.5rem (control height, `h-10`) · `--spacing-unit` 4.75rem (unit column) · `--spacing-page` 1.25rem
- `--focus-ring` 2px solid accent, offset 2px — one definition, used everywhere
- `--duration-fast` 120ms · `--ease-desk` the shared easing curve

Arbitrary Tailwind values are acceptable for **layout only** (grid tracks, max-widths). Never for colour, radius, or control sizing.

---

## Recipes

Class names from [`src/recipes.css`](src/recipes.css), for text and layout that is not a component:

`.eyebrow` `.display-title` `.page-title` `.section-title` `.section-title-sm` `.wordmark` `.lede` `.meta` `.page-wrap` `.page-frame` `.link-quiet` `.link-accent` `.link-row` `.kbd` `.sheet-heading` `.instrument-sheet` `.diagram-surface`

---

## Components

### Button

```tsx
<Button variant="accent" size="md" onClick={save}>Save this check</Button>
<Button asChild variant="outline"><Link to="/review">Start a review</Link></Button>
```

| Variant | Use for |
| --- | --- |
| `accent` | the one primary action on a surface |
| `outline` | **default** — ordinary actions |
| `ghost` | low-emphasis, icon buttons, toolbar actions |
| `mark` | emphasis without full accent weight |
| `destructive` | irreversible actions; pair with `ConfirmDialog` |

Sizes `md` (h-10, default) · `sm` (h-8) · `icon` (square 10).
`asChild` renders the child element instead — use it for links so you get an `<a>`, not a button that navigates.
Disabled state is handled (`opacity-40`, pointer events off); do not restyle it.

### Field, Input, Select, Textarea

```tsx
<Field htmlFor="account-email" label="Email" required hint="We never share it." error={error}>
  <Input id="account-email" type="email" />
</Field>
```

`Field` owns the label, hint, and error, and wires `aria-describedby` / `aria-invalid` to the control. `required` adds both the visual `*` and `aria-required`. Pass `htmlFor` matching the control `id` — `fieldErrorId` derives the error id from it, so never hand-roll that association.

### MeasurementField, UnitSelect, UnitBadge

The fused value + unit control — a number input joined to its unit selector. This is the signature control of the product: **the unit stays on the quantity**. Use it anywhere a number carries a unit, rather than a bare `Input` with a label mentioning units. `UnitSelect` is labelled `aria-label="Unit"` unless overridden.

### Panel, DataRow, InstrumentSheet, ResultQuantity

- `Panel` — a card. `card` (static) or `hover` (interactive).
- `DataRow` — one row of a list: eyebrow, title, meta, actions. Use `align="start"` for multi-line titles.
- `InstrumentSheet` — the Inputs | Results split. `columns="md"` (default) splits at `md:grid-cols-2`; `columns="lg"` keeps the wider desk split.
- `ResultQuantity` / `QuantityName` — a computed value with its unit and symbol.

### OverlayDialog, ConfirmDialog

`OverlayDialog` is modal or drawer, with a focus trap, Escape to close, `inert` on the background, and focus restored to the trigger on close. Pass `restoreFocusTo` when the trigger may unmount — it is read when the dialog **opens**, not when it closes.

`ConfirmDialog` wraps it for a decision: `title`, `confirmLabel`, `cancelLabel`, `onConfirm`, and `busy` (disables both buttons and shows "Working…"). `tone` is `"danger"` by default, rendering the confirm button `destructive` — pass `tone="accent"` only when the action is not irreversible.

### Menu, MenuItem

Arrow-key roving focus, Escape, outside-click, focus restore. Do not build a dropdown from `Panel` + buttons.

### SegmentedControl, SegmentedItem

Exclusive choice. Appearance `plain` (nav/steps) · `solid` · `chip` (equivalent to `FilterChip`). Always give the control an `aria-label`. Pass `current="step"` on the active item when it represents a step in a flow.

### Status components

| Component | Use for | Notes |
| --- | --- | --- |
| `LoadingState` | work in progress | `role="status"`, `aria-live="polite"`; skeletons are `aria-hidden` |
| `EmptyState` | nothing to show yet | give it an `action` pointing somewhere useful |
| `ErrorState` | something failed | `text` or `banner` |
| `SuccessState` | confirmation | |

Do **not** show an `EmptyState` for "not permitted" or "not loaded yet" — render nothing, or a `LoadingState`. An empty state tells the visitor there is nothing there, which is a different claim.

### PageHeader, SearchTrigger, FilterChip, SelectableCard

- `PageHeader` — every room landing: eyebrow, title, lede, actions. Sizes `page` and `display`.
- `SelectableCard` — a card that is itself a link or choice. Keep interactive controls **out** of the link (see the favourite button on library cards, positioned absolutely beside it, not nested inside).

---

## SSR

Anything whose value depends on `localStorage` or a client-resolved session must render the same thing on the server and on the first client render, or React discards the server tree for that page. Use `useHydrated()` from `@/lib/use-hydrated` and gate on it — see `routes/workshop.tsx`, where three separate mismatches collapsed into one `loadingDesk` check.

## Breakpoints

- Chrome (header / drawer): `md` (768px)
- `InstrumentSheet` Inputs | Results: `md:grid-cols-2`
- Compact Studio preview stays one column
- Theme: stored `instrument-theme`, else `prefers-color-scheme`

## Checking your work

```bash
npm run lint      # token and component rules
npm run qa:ui     # 34 behavioural checks against a running dev server
```

`qa:ui` covers focus restore, Escape handling, the destructive confirm variant, mobile overflow at 390px, tablet columns, and page errors including hydration failures. Run it after any change to this package.
