/**
 * Brand-asset gate shared by browser-smoke.mjs (and unit-testable without a
 * browser): a canvas app is almost always a game / visually rich app, and
 * those must ship a custom share card. There is no fallback: a page with no
 * card emits no og:image at all, so a link to it does not unfurl.
 *
 * Games must also set type=x:game in src/lib/og/site.json so the head
 * injector emits og:type for X game-card unfurls, and public/x-banner.jpg for
 * the 50:11 X feed card. A card file is enough for bake to emit /og.jpg, but
 * brand-check still requires site.json `"card": "custom"` so the agent-facing
 * contract stays explicit.
 *
 * Checked on the filesystem (not the served head) so preview and mid-scaffold
 * workspaces are judged the same way.
 */
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { OG_SITE_REL_PATH, readOgSite, siteHasCustomCard } from "./pwa-shared.mjs";

// Over this, link scrapers (X card previews included) time out or skip the
// image, so the card silently fails to unfurl. The JPEG contract
// (ffmpeg -q:v 4, ~150-300 KB) exists precisely to stay under it.
export const MAX_CARD_BYTES = 600 * 1024;

export function siteDeclaresOgTypeGame(site) {
  return String(site?.type ?? "").toLowerCase() === "x:game";
}

export function computeBrandWarnings({ hasCanvas, workspaceRoot = "/workspace" }) {
  const sitePath = join(workspaceRoot, OG_SITE_REL_PATH);
  const site = readOgSite(workspaceRoot);
  const cardPath = [
    join(workspaceRoot, "public/og.jpg"),
    join(workspaceRoot, "public/og.png"),
  ].find(existsSync);
  const warnings = [];

  if (cardPath !== undefined) {
    if (statSync(cardPath).size > MAX_CARD_BYTES) {
      warnings.push(
        `BRAND WARNING: ${cardPath} is over 600 KB — link scrapers (X card previews included) `
          + "time out or skip images this heavy, so the card silently fails to unfurl. "
          + `Re-encode as JPEG (public/og.jpg, ffmpeg -q:v 4).`,
      );
    }
    if (!siteHasCustomCard(site)) {
      warnings.push(
        `BRAND WARNING: ${cardPath} exists but ${sitePath} is missing "card": "custom". `
          + "Bake infers custom from the file, but set the flag in "
          + `${sitePath} so identity is explicit.`,
      );
    }
  } else if (hasCanvas) {
    warnings.push(
      `BRAND WARNING: this looks like a game/canvas app but ${workspaceRoot}/public/og.jpg `
        + "is missing. Games and visually rich apps must ship a custom 1200x630 share card "
        + "built from the app's own art. There is no fallback card, so without one a link "
        + "to this app does not unfurl at all. You are not done: finish the brand-asset pass.",
    );
  } else {
    warnings.push(
      "BRAND NOTE: no custom public/og.jpg — this app will emit no share card at all. "
        + "Custom cards are the default for games of every kind (DOM board/word games included), "
        + "whimsical apps, creative tools, and brand-forward pages — only plain utilities "
        + "(converters, CRUD trackers, admin dashboards) can reasonably go without. If this app "
        + "is not a plain utility, finish the brand-asset pass.",
    );
  }

  if (hasCanvas && !siteDeclaresOgTypeGame(site)) {
    warnings.push(
      'BRAND WARNING: this looks like a game/canvas app but src/lib/og/site.json is missing '
        + '"type": "x:game". X uses og:type=x:game to present the unfurl as a game card — set '
        + `it in ${sitePath}. Do not invent `
        + "x:type or overload twitter:card as the game signal.",
    );
  }

  // Games with a custom link card must also ship the 50:11 X feed card.
  // Skipped while there is no card at all — that pass has not started yet.
  if (hasCanvas && cardPath !== undefined) {
    const bannerPath = join(workspaceRoot, "public/x-banner.jpg");
    if (!existsSync(bannerPath)) {
      warnings.push(
        `BRAND WARNING: this looks like a game/canvas app but ${bannerPath} is missing. `
          + "Games need a 50:11 X feed card (1200×264 JPEG) at public/x-banner.jpg — "
          + "finish the brand-asset pass.",
      );
    } else if (statSync(bannerPath).size > MAX_CARD_BYTES) {
      warnings.push(
        `BRAND WARNING: ${bannerPath} is over 600 KB — link scrapers (X card previews `
          + "included) time out or skip images this heavy, so the feed card silently fails "
          + "to unfurl. Re-encode as JPEG (ffmpeg -q:v 4).",
      );
    }
  }

  return warnings;
}
