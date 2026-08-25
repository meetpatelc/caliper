import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Flat ESLint config for the TanStack Start app-builder template. */
export default tseslint.config(
  {
    ignores: [
      "dist/**",
      ".output/**",
      ".vercel/**",
      ".nitro/**",
      "node_modules/**",
      // Agent scratch space — `.claude/worktrees/` holds whole checkouts of
      // this repo, which would otherwise be linted a second time.
      ".claude/**",
      "src/routeTree.gen.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Test and QA runners are .mjs files that import .ts sources directly (run
  // under Node's type stripping); they open with `@ts-nocheck` so `tsc --noEmit`
  // (checkJs) skips them. Allow that one directive there — product code keeps
  // the ban.
  {
    files: ["**/*.test.mjs", "scripts/*-qa.mjs"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
  // `react-refresh/only-export-components` protects Fast Refresh in APP files.
  // The kit is a library: `buttonVariants`, `panelClass` and `fieldErrorId` are
  // part of its public API and deliberately ship beside the components they
  // belong to. Splitting them into sibling files to satisfy a dev-server
  // heuristic would make the kit worse to consume.
  {
    files: ["packages/ui/src/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  // ── Design-system enforcement ──────────────────────────────────────────────
  // CONTRIBUTING asks for "no ad-hoc hex in JSX", and today the app honours it
  // exactly: zero raw hex and zero bare <button> across src/. That was
  // discipline, not a guarantee — these rules make it the latter, so the next
  // contributor cannot quietly reintroduce an off-system colour.
  //
  // Colours belong in packages/ui/src/tokens.css, which is why that file (and
  // the kit's own CSS) is not covered here.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          // Catches `#c8102e`, `#fff`, `#RRGGBBAA` — in className strings,
          // style props, chart config, anywhere in a string literal.
          selector:
            "Literal[value=/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]",
          message:
            "No raw hex colours. Use a semantic token (bg/surface/elevated/fg/muted/accent/border/danger/ok) from packages/ui/src/tokens.css.",
        },
        {
          // Tailwind's default palette bypasses the token layer entirely and
          // breaks dark mode, which reassigns token NAMES rather than values.
          selector:
            "Literal[value=/\\b(?:bg|text|border|ring|fill|stroke|from|via|to|decoration|outline|shadow|accent|caret|divide)-(?:slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)\\b/]",
          message:
            "No Tailwind palette colours. Use a semantic token (bg/surface/elevated/fg/muted/accent/border/danger/ok) — dark mode reassigns token names, so palette classes will not follow the theme.",
        },
        {
          // The kit owns every interactive control; a bare <button> misses the
          // shared focus ring, sizing and variants.
          selector: "JSXOpeningElement[name.name='button']",
          message:
            "Use <Button> from @instrument/ui (via @/components/ui/button) rather than a bare <button>.",
        },
      ],
    },
  },
  // Disable rules that conflict with Prettier formatting.
  prettier,
);
