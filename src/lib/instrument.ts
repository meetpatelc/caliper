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
/*
 * "The model is in the frame" asked the reader to decode a metaphor before the
 * sentence paid out, and this string is the meta description — the one line
 * that has to work for someone who has never seen the site. "You can check" is
 * also the more honest claim: the site does not ask for trust, it shows the
 * working and invites you to disagree with it.
 */
export const APP_DESCRIPTION =
  "Instrument is a calculator you can check: the formula sits next to the number. Open a finished model, or write your own. Sign in and Project follows the account.";
