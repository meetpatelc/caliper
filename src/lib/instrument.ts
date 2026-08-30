import { THEME_STORAGE_KEY } from "@/lib/storage-keys";
export const PARENT_NAME = "Instrument";
export const PARENT_WORDMARK = "INSTRUMENT";
export const THEME_KEY = THEME_STORAGE_KEY.name;
/**
 * Browser chrome colour for `<meta name="theme-color">`, which is emitted
 * during SSR and cannot reference a CSS custom property — so these must be
 * literals even though the values live in `packages/ui/src/tokens.css`.
 *
 * They MUST equal `--color-bg` in each theme, or the browser chrome disagrees
 * with the page behind it. `theme-color.test.mjs` reads the token file and
 * fails if they drift, so this is a checked projection, not a second source.
 */
// eslint-disable-next-line no-restricted-syntax -- see above; pinned by theme-color.test.mjs
export const THEME_COLOR = { light: "#e8eaed", dark: "#14161a" } as const;
export const SEARCH_EVENT = "instrument:open-search";
export const APP_DESCRIPTION =
  "Instrument is a calculator you can trust because the model is in the frame. Open a finished one, or write your own. Sign in and Project follows the account.";
